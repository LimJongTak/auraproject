import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

setGlobalOptions({ maxInstances: 10 });

initializeApp();

interface TeamData {
  leaderUid: string;
  memberUids: string[];
}

interface MembershipData {
  teamId: string;
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

  const membershipsSnap = await db.collection("teamMemberships").where("uid", "==", targetUid).get();

  for (const membershipDoc of membershipsSnap.docs) {
    const { teamId } = membershipDoc.data() as MembershipData;
    const teamRef = db.doc(`teams/${teamId}`);
    await db.runTransaction(async (tx) => {
      const teamSnap = await tx.get(teamRef);
      if (!teamSnap.exists) {
        tx.delete(membershipDoc.ref);
        return;
      }
      const team = teamSnap.data() as TeamData;
      const remainingMemberUids = team.memberUids.filter((m) => m !== targetUid);

      if (remainingMemberUids.length === 0) {
        tx.delete(teamRef);
      } else if (team.leaderUid === targetUid) {
        // Reassign leadership to the next member so an admin-forced
        // withdrawal never leaves a team leaderless.
        tx.update(teamRef, { leaderUid: remainingMemberUids[0], memberUids: remainingMemberUids });
      } else {
        tx.update(teamRef, { memberUids: remainingMemberUids });
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

  return { ok: true };
});

// One-off/idempotent migration: populates studentIdIndex/{studentId} -> {uid, email}
// from existing users docs, for accounts created before login-by-studentId existed.
// Safe to call more than once — already-indexed or colliding studentIds are skipped.
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

    await indexRef.set({ uid: userDoc.id, email: data.email });
    created++;
  }

  return { created, skipped };
});
