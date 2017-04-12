import { Component, ViewChild, ElementRef } from '@angular/core';
import { Platform, NavController, PopoverController } from 'ionic-angular';
import { SettingsPage } from './settings';

const RADIUS=200;
const MAXINTENSITY=130;

declare var WifiWizard: any;
declare var navigator: any;
declare var google: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  @ViewChild('map') mapElement: ElementRef;
  @ViewChild('popoverContent', { read: ElementRef }) content: ElementRef;
  @ViewChild('popoverText', { read: ElementRef }) text: ElementRef;

  map: any;
  heatmap: any;
  networkData: any = {};
  ssid: string = null;
  ssidList: Array<string> = [];
  networks: Array<{
    level: number;
    SSID: string;
    BSSID: string;
    frequency: number;
    capabilities: string;
  }> = [];

  constructor(
    public navCtrl: NavController,
    public popoverCtrl: PopoverController,
    private platform: Platform
  ) {
    platform.ready().then( () => {
      this.initMap();
      let currentDataString = window.localStorage.getItem('networkData');
      if (currentDataString) {
        let currentData = JSON.parse(currentDataString);
        for (let ssid in currentData) {
          let heatmapData = [];
          for (let i=0; i < currentData[ssid].heatmapData.length; i++) 
            heatmapData.push({
              location: new google.maps.LatLng(
                currentData[ssid].heatmapData[i].location.lat,
                currentData[ssid].heatmapData[i].location.lng
              ),
              weight: currentData[ssid].heatmapData[i].weight
            });
          this.networkData[ssid] = {
            level: currentData[ssid].level,
            heatmapData: heatmapData
          }
        }
        this.createSsidList();
      }
      navigator.geolocation.watchPosition( (position) => {
        var latLng = new google.maps.LatLng(
          position.coords.latitude,
          position.coords.longitude
        );
        WifiWizard.getScanResults( (networks) => {
          if (this.ssid == null) {
            this.ssid = networks[0].SSID;
            this.map.panTo(latLng);
          }
          let centerToPosition = localStorage.getItem('centerToPosition');
          if (centerToPosition == 'true')
            this.map.panTo(latLng);
          this.updateHeatmap(latLng, networks);
        });
      }, (error) => {}, { enableHighAccuracy: true });
    });
  }

  getWeight(level) {
    let value = 2 * (level + 100);
    if (value < 0) 
      value = 0;
    if (value > MAXINTENSITY)
      value = MAXINTENSITY;
    return value;
  }
    
  createSsidList() {
    this.ssidList = Object.keys(this.networkData).sort();
    this.ssidList = this.ssidList.filter(function(e){ return e != "" });
  }

  updateHeatmap(location, networks) {
    let processedNetworks = {};
    for (let i=0; i < networks.length; i++) {
      let ssid = networks[i].SSID;
      processedNetworks[ssid] = true;
      if (!(ssid in this.networkData))
         this.networkData[ssid] = {
           level: null,
           heatmapData: []
         };
      
      var maxLevel = -200;
      for (let j=0; j < networks.length; j++) {
        if (networks[j].SSID == ssid) {
          let level = networks[j].level;
          if (level > maxLevel) 
            maxLevel = level;
        }
      }
      this.networkData[ssid].level = maxLevel;
      var found = false;
      for (let i=0; i < this.networkData[ssid].heatmapData.length; i++) {
        let distance = google.maps.geometry.spherical.computeDistanceBetween(
          location,
          this.networkData[ssid].heatmapData[i].location
        );
        if (distance < 10) {
          found = true;
          let weight = this.getWeight(maxLevel);
          if (weight > this.networkData[ssid].heatmapData[i].weight)
            this.networkData[ssid].heatmapData[i].weight = weight;
        }
      }
      if ((!found) && (maxLevel > -200)) {
        let weightedLocation = {
          location: location,
          weight: this.getWeight(maxLevel)
        };
        this.networkData[ssid].heatmapData.push(weightedLocation);
      }
    }
    this.createSsidList();
        //alert(ssid + ' ' + processedNetworks.length + ' ' + processedNetworks[0]);
    for (let ssid in this.networkData) 
      if (!(ssid in processedNetworks)) 
        this.networkData[ssid].level = -200;
    this.heatmap.setData(this.networkData[this.ssid].heatmapData);
    if (window.localStorage.getItem('saveData') == 'true') {
      let saveObject = {};
      for (let ssid in this.networkData) {
        let network = this.networkData[ssid];
        let heatmapData = [];
        for (let i=0; i < network.heatmapData.length; i++) 
          heatmapData.push({ 
            location: {
              lat: network.heatmapData[i].location.lat(),
              lng: network.heatmapData[i].location.lng()
            },
            weight: network.heatmapData[i].weight
          });
        saveObject[ssid] = {
          level: network.level,
          heatmapData: heatmapData 
        } 
      }
      window.localStorage.setItem('networkData', JSON.stringify(saveObject));
    }
  }

  refreshMap() {
    this.heatmap.setData(this.networkData[this.ssid].heatmapData);
  }

  initMap () {
    let latLng = new google.maps.LatLng(37.81084667, -122.32957667);

    let mapOptions = {
      center: latLng,
      zoom: 20,
      mapTypeId: google.maps.MapTypeId.HYBRID
    }

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
    this.heatmap = new google.maps.visualization.HeatmapLayer({
      data: [],
      radius: RADIUS,
      //dissipating: true,
      maxIntensity: MAXINTENSITY,
      gradient: [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)'
      ],
      map: this.map
    });

    this.map.addListener('zoom_changed', () => {
      let zoom=this.map.getZoom();
      if (zoom == 20)
       this.heatmap.setOptions({radius: RADIUS})
      else if (zoom == 19)
       this.heatmap.setOptions({radius: RADIUS/2})
      else if (zoom == 18)
       this.heatmap.setOptions({radius: RADIUS/4})
      else if (zoom == 17)
       this.heatmap.setOptions({radius: Math.round(RADIUS/8)})
      else if (zoom == 16)
       this.heatmap.setOptions({radius: Math.round(RADIUS/16)})
      else if (zoom == 15)
       this.heatmap.setOptions({radius: Math.round(RADIUS/32)})
      else
       this.heatmap.setOptions({radius: Math.round(RADIUS/64)});
    });
  }

  presentSettings(event) {
   let settingsModal = this.popoverCtrl.create(SettingsPage);
   settingsModal.present({
     ev: event
   });
  }
}
