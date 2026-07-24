import { customAlphabet } from "nanoid";

// 헷갈리기 쉬운 0/O, 1/I/L 을 제외한 대문자+숫자 6자리 초대코드
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const generateInviteCode = customAlphabet(ALPHABET, 6);
