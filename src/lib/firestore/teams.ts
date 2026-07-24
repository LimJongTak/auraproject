import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { generateInviteCode } from "@/lib/utils/inviteCode";
import type { Team, TeamMembership } from "@/types/models";

export class TeamError extends Error {}

const membershipId = (uid: string, categoryId: string) => `${uid}_${categoryId}`;

export async function createTeam(
  uid: string,
  name: string,
  categoryId: string,
  categoryName: string
): Promise<string> {
  // invite code == doc ID, retry on the astronomically rare collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const teamRef = doc(db, "teams", code);
    const membershipRef = doc(db, "teamMemberships", membershipId(uid, categoryId));
    try {
      await runTransaction(db, async (tx) => {
        const [teamSnap, membershipSnap] = await Promise.all([tx.get(teamRef), tx.get(membershipRef)]);
        if (teamSnap.exists()) throw new TeamError("CODE_COLLISION");
        if (membershipSnap.exists()) throw new TeamError("이미 이 대회에 소속된 팀이 있어요");

        tx.set(teamRef, {
          name,
          categoryId,
          categoryName,
          leaderUid: uid,
          memberUids: [uid],
          createdAt: serverTimestamp(),
        });
        tx.set(membershipRef, {
          uid,
          categoryId,
          teamId: code,
          createdAt: serverTimestamp(),
        });
      });
      return code;
    } catch (error) {
      if (error instanceof TeamError && error.message === "CODE_COLLISION") continue;
      throw error;
    }
  }
  throw new TeamError("팀 생성에 실패했어요. 다시 시도해주세요.");
}

export async function joinTeam(uid: string, inviteCode: string): Promise<void> {
  const code = inviteCode.trim().toUpperCase();
  const teamRef = doc(db, "teams", code);

  await runTransaction(db, async (tx) => {
    const teamSnap = await tx.get(teamRef);
    if (!teamSnap.exists()) throw new TeamError("초대코드를 다시 확인해주세요");
    const team = teamSnap.data() as Team;
    if (team.memberUids.includes(uid)) throw new TeamError("이미 참여 중인 팀이에요");

    const membershipRef = doc(db, "teamMemberships", membershipId(uid, team.categoryId));
    const membershipSnap = await tx.get(membershipRef);
    if (membershipSnap.exists()) throw new TeamError("이미 이 대회에 소속된 팀이 있어요");

    tx.update(teamRef, { memberUids: [...team.memberUids, uid] });
    tx.set(membershipRef, {
      uid,
      categoryId: team.categoryId,
      teamId: code,
      createdAt: serverTimestamp(),
    });
  });
}

export async function leaveTeam(uid: string, teamId: string): Promise<void> {
  const teamRef = doc(db, "teams", teamId);

  await runTransaction(db, async (tx) => {
    const teamSnap = await tx.get(teamRef);
    if (!teamSnap.exists()) return;
    const team = teamSnap.data() as Team;
    if (team.leaderUid === uid) {
      throw new TeamError("팀장은 탈퇴할 수 없어요. 팀 해체를 이용해주세요.");
    }
    tx.update(teamRef, { memberUids: team.memberUids.filter((m) => m !== uid) });
    tx.delete(doc(db, "teamMemberships", membershipId(uid, team.categoryId)));
  });
}

export async function disbandTeam(uid: string, teamId: string): Promise<void> {
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) return;
  const team = teamSnap.data() as Team;
  if (team.leaderUid !== uid) throw new TeamError("팀장만 팀을 해체할 수 있어요");
  if (team.memberUids.length > 1) {
    throw new TeamError("다른 팀원이 모두 탈퇴한 후 해체할 수 있어요");
  }
  await runTransaction(db, async (tx) => {
    tx.delete(teamRef);
    tx.delete(doc(db, "teamMemberships", membershipId(uid, team.categoryId)));
  });
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(db, "teams", teamId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null;
}

export async function listAllTeamsForAdmin(): Promise<Team[]> {
  const snap = await getDocs(collection(db, "teams"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
}

export async function getMembership(uid: string, categoryId: string): Promise<TeamMembership | null> {
  const snap = await getDoc(doc(db, "teamMemberships", membershipId(uid, categoryId)));
  return snap.exists() ? (snap.data() as TeamMembership) : null;
}

export function subscribeMyMemberships(uid: string, cb: (memberships: TeamMembership[]) => void) {
  const q = query(collection(db, "teamMemberships"), where("uid", "==", uid));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as TeamMembership));
  });
}
