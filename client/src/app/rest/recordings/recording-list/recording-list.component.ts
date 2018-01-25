import { Component, OnInit } from '@angular/core';
import { RestService } from "../../shared/rest.service";

@Component({
  selector: 'recording-list',
  templateUrl: './recording-list.component.html',
  styleUrls: ['./recording-list.component.css']
})
export class RecordingListComponent implements OnInit {

  raagisRecordingsShabads = [];
  shabadListObj = [];
  shabadList = [];
  panktiList = [];
  raagisRecordings = [];
  empty = [0,1]
  raagiTree = {
    name: "",
    children: []
  };

  constructor(private restService: RestService) { }

  ngOnInit() {
    this.getRaagis();
    this.getShabads();
  }

  // REST call to GET Raagis and Recordings
  getRaagis(){
    this.restService.getRaagis()
      .then(data => this.extractRaagiData(data))
      .catch(error => console.log(error));
  }

  getShabads(){
    let componentThis = this;
    this.restService.getShabads()
      .then(function(data){
        componentThis.shabadListObj = data;
        for(let shabad of data){
          componentThis.shabadList.push(shabad.shabad_english_title)
        }
        componentThis.shabadList.sort()
      })
      .catch(error => console.log(error));
  }

  // Create Tree to view in a list.
  private extractRaagiData(data){
    for(let raagi of data){
      let raagiObj = {
        name: raagi.raagi_name,
        children: []
      };

      for(let recording of raagi.recordings){
        let recordingObj = {
          name: recording.recording_title,
          date: recording.date_added,
          children: []
        };

        for(let shabad of recording.shabads){
          recordingObj.children.push({
            name: shabad.shabad_english_title,
          });
        }
        this.raagisRecordings.push(recordingObj);
        raagiObj.children.push(recordingObj);
      }

      this.raagisRecordingsShabads.push(raagiObj);
    }

    this.raagisRecordings.sort(this.compareByDate);
    this.raagisRecordingsShabads.sort(this.compareByName);
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

  //Sort Alphabetically by Name Object
  private  compareByName(a,b) {
    if (a.name < b.name)
      return -1;
    if (a.name > b.name)
      return 1;
    return 0;
  }

  //Reverse - by most recent
  private  compareByDate(a,b) {
    if (a.date < b.date)
      return 1;
    if (a.date > b.date)
      return -1;
    return 0;
  }

}
