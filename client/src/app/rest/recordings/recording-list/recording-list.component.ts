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


  constructor(private restService: RestService) { }

  ngOnInit() {
    this.getRecentRecordings();
    this.getShabads();
  }

  getRecentRecordings(){
    this.restService.getRecentRecordings()
      .then(data => this.recentRecordings = data)
      .catch(error => console.log(error));
  }

  getShabads(){
    let componentThis = this;
    this.restService.getShabads()
      .then(function(data){
        componentThis.shabadListObj = data;
        for(let shabad of data){
          componentThis.allShabadList.push(shabad.shabad_english_title)
        }
      })
      .catch(error => console.log(error));
  }

  onShabadTitleSelected(shabad){
    this.panktiList = [];
    let componentThis = this;
    for(let shabadObj of this.shabadListObj){
      if(shabad === shabadObj.shabad_english_title){
        this.restService.getRangeLines(shabadObj.starting_id, shabadObj.ending_id)
          .then(function(data){
            let completeShabadObj = data;
            for(let panktiObj of completeShabadObj){
              componentThis.panktiList.push(panktiObj['Gurmukhi'])
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
