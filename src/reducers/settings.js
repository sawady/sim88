import { SET_SETTINGS, defaultSettings } from '../actions/settings';

export default (state = defaultSettings(), action) => {
  switch (action.type) {
    case SET_SETTINGS:
      return { ...state, ...action.settings };
    default:
      return state;
  }
};
