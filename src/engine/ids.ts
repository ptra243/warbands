/* Ids for owned things. */
let UID = 1;
export const nextUid = (): number => UID++;
/** make sure future ids do not collide with ids already in a restored run */
export const reserveUid = (uid: number): void => {
  UID = Math.max(UID, uid + 1);
};
