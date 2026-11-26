/* Status lines for saving and downloading. */
import { S } from './state.ts';

export function setSave(t: string): void {
  S.save = t;
  const e = document.getElementById('save');
  if (e) e.textContent = t;
}
export function setDl(t: string): void {
  S.dlmsg = t;
  document.querySelectorAll('.dlmsg').forEach((e) => {
    e.textContent = t;
  });
}
