import {randomBytes} from "node:crypto";
import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/https";
import {onSchedule} from "firebase-functions/scheduler";
import {initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import {getStorage} from "firebase-admin/storage";

setGlobalOptions({maxInstances: 10});

initializeApp();

interface TeamData {
  leaderUid: string;
  memberUids: string[];
}

interface MembershipData {
  teamId: string;
}

/**
 * Throws unless the given uid belongs to an admin user.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} callerUid Uid of the caller to check.
 * @return {Promise<void>} Resolves if the caller is an admin.
 */
async function requireAdmin(
  db: FirebaseFirestore.Firestore,
  callerUid: string
): Promise<void> {
  const callerSnap = await db.doc(`users/${callerUid}`).get();
  if (callerSnap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "관리자만 사용할 수 있어요");
  }
}

export const adminWithdrawUser = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "로그인이 필요해요");

  const targetUid = request.data?.uid;
  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "대상 사용자를 확인할 수 없어요");
  }
  if (targetUid === callerUid) {
    throw new HttpsError("failed-precondition", "본인 계정은 이 기능으로 탈퇴시킬 수 없어요");
  }

  const db = getFirestore();

  const callerSnap = await db.doc(`users/${callerUid}`).get();
  if (callerSnap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "관리자만 사용할 수 있어요");
  }

  const membershipsSnap = await db.collection("teamMemberships")
    .where("uid", "==", targetUid).get();

  for (const membershipDoc of membershipsSnap.docs) {
    const {teamId} = membershipDoc.data() as MembershipData;
    const teamRef = db.doc(`teams/${teamId}`);
    await db.runTransaction(async (tx) => {
      const teamSnap = await tx.get(teamRef);
      if (!teamSnap.exists) {
        tx.delete(membershipDoc.ref);
        return;
      }
      const team = teamSnap.data() as TeamData;
      const remainingMemberUids =
          team.memberUids.filter((m) => m !== targetUid);

      if (remainingMemberUids.length === 0) {
        tx.delete(teamRef);
      } else if (team.leaderUid === targetUid) {
        // Reassign leadership to the next member so an admin-forced
        // withdrawal never leaves a team leaderless.
        tx.update(teamRef, {
          leaderUid: remainingMemberUids[0],
          memberUids: remainingMemberUids,
        });
      } else {
        tx.update(teamRef, {memberUids: remainingMemberUids});
      }
      tx.delete(membershipDoc.ref);
    });
  }

  await db.doc(`users/${targetUid}`).delete();

  try {
    await getAuth().deleteUser(targetUid);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "auth/user-not-found") throw err;
  }

  return {ok: true};
});

// One-off/idempotent migration: populates studentIdIndex/{studentId} ->
// {uid, email} from existing users docs, for accounts created before
// login-by-studentId existed. Safe to call more than once — already-indexed
// or colliding studentIds are skipped.
export const backfillStudentIdIndex = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "로그인이 필요해요");

  const db = getFirestore();

  const callerSnap = await db.doc(`users/${callerUid}`).get();
  if (callerSnap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "관리자만 사용할 수 있어요");
  }

  const usersSnap = await db.collection("users").get();
  let created = 0;
  const skipped: string[] = [];

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data() as { studentId?: string; email?: string };
    const studentId = data.studentId?.trim();
    if (!studentId || !data.email) {
      skipped.push(userDoc.id);
      continue;
    }

    const indexRef = db.doc(`studentIdIndex/${studentId}`);
    const indexSnap = await indexRef.get();
    if (indexSnap.exists) {
      if (indexSnap.data()?.uid !== userDoc.id) skipped.push(userDoc.id);
      continue;
    }

    await indexRef.set({uid: userDoc.id, email: data.email});
    created++;
  }

  return {created, skipped};
});

// Login codes avoid visually-ambiguous characters (0/O, 1/I/L) since they're
// meant to be read off a screen and typed in by a judge.
const JUDGE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const JUDGE_PASSWORD_ALPHABET =
    "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_BULK_JUDGE_ISSUE = 30;

/**
 * Generates a random string drawn from the given alphabet.
 * @param {number} length Number of characters to generate.
 * @param {string} alphabet Characters to draw from.
 * @return {string} The generated token.
 */
function randomToken(length: number, alphabet: string): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

interface IssuedJudgeAccount {
  uid: string;
  loginCode: string;
  password: string;
  name: string;
}

// Bulk-issues throwaway judge accounts scoped to one contest. Each account
// gets a random login code (used as its studentId, per the existing
// studentId -> email login flow) and a random password, both returned once —
// they aren't recoverable afterward, so the caller must show/copy them
// immediately. Quantity is capped so one call can't mint an unbounded number
// of Auth users.
export const issueJudgeAccounts = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "로그인이 필요해요");

  const db = getFirestore();
  await requireAdmin(db, callerUid);

  const categoryId = request.data?.categoryId;
  const count = request.data?.count;
  const rawNamePrefix = request.data?.namePrefix;
  const namePrefix =
    typeof rawNamePrefix === "string" && rawNamePrefix.trim() ?
      rawNamePrefix.trim().slice(0, 40) :
      "임시 심사위원";

  if (!categoryId || typeof categoryId !== "string") {
    throw new HttpsError("invalid-argument", "대회를 확인할 수 없어요");
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_BULK_JUDGE_ISSUE) {
    throw new HttpsError(
      "invalid-argument",
      `발급 수량은 1~${MAX_BULK_JUDGE_ISSUE}개 사이여야 해요`
    );
  }

  const categorySnap = await db.doc(`categories/${categoryId}`).get();
  if (!categorySnap.exists) {
    throw new HttpsError("not-found", "대회를 찾을 수 없어요");
  }
  const categoryName = (categorySnap.data()?.name as string | undefined) ?? "";

  const auth = getAuth();
  const issued: IssuedJudgeAccount[] = [];

  for (let i = 0; i < count; i++) {
    let code: string | null = null;
    let indexRef: FirebaseFirestore.DocumentReference | null = null;
    for (let attempt = 0; attempt < 5 && !code; attempt++) {
      const candidate = `JUDGE-${randomToken(6, JUDGE_CODE_ALPHABET)}`;
      const ref = db.doc(`studentIdIndex/${candidate}`);
      if (!(await ref.get()).exists) {
        code = candidate;
        indexRef = ref;
      }
    }
    if (!code || !indexRef) {
      throw new HttpsError("internal", "로그인 코드를 생성하지 못했어요. 다시 시도해주세요");
    }

    const password = randomToken(10, JUDGE_PASSWORD_ALPHABET);
    const email = `${code.toLowerCase()}@judge.aura.local`;
    const name = `${namePrefix} ${i + 1}`;

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    await db.doc(`users/${userRecord.uid}`).set({
      name,
      phone: "",
      memberType: "staff",
      school: "-",
      department: "-",
      grade: "",
      studentId: code,
      email,
      role: "judge",
      isTemporary: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    await indexRef.set({uid: userRecord.uid, email});

    await db.doc(`judgeAssignments/${userRecord.uid}_${categoryId}`).set({
      uid: userRecord.uid,
      categoryId,
      categoryName,
      judgeName: name,
      isTemporary: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    issued.push({uid: userRecord.uid, loginCode: code, password, name});
  }

  return {accounts: issued};
});

// Fully deletes a bulk-issued temp judge account (Auth user, profile,
// studentId login index, and every contest assignment it holds). Restricted
// to isTemporary accounts so it can't be pointed at a real user's account.
export const revokeTempJudgeAccount = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "로그인이 필요해요");

  const db = getFirestore();
  await requireAdmin(db, callerUid);

  const targetUid = request.data?.uid;
  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "대상 계정을 확인할 수 없어요");
  }

  const userRef = db.doc(`users/${targetUid}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError("not-found", "계정을 찾을 수 없어요");

  const userData =
      userSnap.data() as { isTemporary?: boolean; studentId?: string };
  if (!userData.isTemporary) {
    throw new HttpsError("failed-precondition", "임시 발급 계정만 이 기능으로 삭제할 수 있어요");
  }

  const assignmentsSnap = await db.collection("judgeAssignments")
    .where("uid", "==", targetUid).get();
  const batch = db.batch();
  for (const assignmentDoc of assignmentsSnap.docs) {
    batch.delete(assignmentDoc.ref);
  }
  if (userData.studentId) {
    batch.delete(db.doc(`studentIdIndex/${userData.studentId}`));
  }
  batch.delete(userRef);
  await batch.commit();

  try {
    await getAuth().deleteUser(targetUid);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "auth/user-not-found") throw err;
  }

  return {ok: true};
});

// A team's exhibition doc starts as "draft" and only ever flips to
// "published" as the very last step of the /exhibitions/new submit flow (see
// createDraftExhibition / publishExhibitionPages in the web app). If that
// flow never finishes — network drop mid-upload, browser closed — the doc is
// orphaned in "draft" forever, since nothing else transitions it and a team
// can only have one draft at a time (the form resumes into it instead of
// creating a second one). Sweep these out once they've clearly been
// abandoned, along with whatever partial page/thumbnail images made it to
// Storage before the flow died.
const DRAFT_STALE_MS = 48 * 60 * 60 * 1000;

export const cleanupOrphanedDrafts = onSchedule("every 24 hours", async () => {
  const db = getFirestore();
  const cutoff = Date.now() - DRAFT_STALE_MS;

  const snap = await db.collection("exhibitions")
    .where("status", "==", "draft").get();
  const stale = snap.docs.filter(
    (d) => (d.data().createdAt?.toMillis?.() ?? 0) <= cutoff
  );
  if (stale.length === 0) return;

  const bucket = getStorage().bucket();
  for (const draftDoc of stale) {
    await bucket.deleteFiles({
      prefix: `exhibitions/${draftDoc.id}/`,
    }).catch(() => {
      // Storage cleanup is best-effort — an orphaned file under a deleted
      // exhibition's prefix is harmless, just wasted space.
    });
    await draftDoc.ref.delete();
  }
});
