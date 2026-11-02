// localStorage may be missing or throw (private windows, blocked storage):
// then nothing is remembered.
export const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      // not remembered
    }
  },
};
