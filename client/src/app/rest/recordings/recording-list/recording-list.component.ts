import { Component, OnInit } from '@angular/core';
import { RestService } from "../../shared/rest.service";

@Component({
  selector: 'recording-list',
  templateUrl: './recording-list.component.html',
  styleUrls: ['./recording-list.component.css']
})
export class RecordingListComponent implements OnInit {

  shabadListObj = [];
  shabadList = [];
  allShabadList = [];
  panktiList = [];
  recentRecordings = [];

  selectedRaagi: string;
  shabadsOfSelectedRaagi = [];
  constructor(private restService: RestService) { }

  ngOnInit() {
    this.getRecentRecordings();
    this.getShabads();
    this.restService.selectedRaagi.subscribe(selectedRaagi => {
      this.selectedRaagi = selectedRaagi;
      this.restService.getShabadsByRaagi(selectedRaagi)
        .then(shabads => this.shabadsOfSelectedRaagi = shabads)
        .catch(error => console.log(error));
    });
  }

  getRecentRecordings(){
    this.restService.getRecentRecordings()
      .then(data => this.recentRecordings = data)
      .catch(error => console.log(error));
  }

  getShabads(){
    this.restService.getShabads()
      .then(data => {
        this.shabadListObj = data;
        for(let shabad of data){
          this.allShabadList.push(shabad.shabad_english_title)
        }
      })
      .catch(error => console.log(error));
  }

  onShabadTitleSelected(shabad){
    this.panktiList = [];
    for(let shabadObj of this.shabadListObj){
      if(shabad === shabadObj.shabad_english_title){
        this.restService.getRangeLines(shabadObj.starting_id, shabadObj.ending_id)
          .then(data => {
            let completeShabadObj = data;
            for(let panktiObj of completeShabadObj){
              this.panktiList.push(panktiObj['Gurmukhi'])
            }
          })
          .catch(error => console.log(error));
        break;
      }
    }
  }

  onRecordingTitleSelected(recording_title){
    this.restService.getShabadsByRecording(recording_title)
      .then(data => this.shabadList = data)
      .catch(error => console.log(error));
  }

}
