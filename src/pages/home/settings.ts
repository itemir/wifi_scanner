import { Component } from '@angular/core';
@Component({
  templateUrl: 'settings.html'
})
export class SettingsPage {
  center: boolean = false;
  save: boolean = false;
  frequency: string = 'all';

  constructor() {
    this.center = window.localStorage.getItem('centerToPosition') == 'true';
    this.save = window.localStorage.getItem('saveData') == 'true';
    this.frequency = window.localStorage.getItem('frequency') || 'all'; 
  }

  changeCentering() {
    window.localStorage.setItem('centerToPosition', this.center.toString());
  }

  changeSaving() {
    window.localStorage.setItem('saveData', this.save.toString());
    if (this.save == false)
      window.localStorage.removeItem('networkData');
  }

  changeFrequency() {
    window.localStorage.setItem('frequency', this.frequency);
  }
}
