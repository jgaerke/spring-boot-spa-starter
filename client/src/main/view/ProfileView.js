import View from './View';
class ProfileView extends View {
  constructor() {
    super('#viewport', '#profile', '/partials/account/profile.html');
  }
}

export default ProfileView;