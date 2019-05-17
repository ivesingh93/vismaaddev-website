import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {RestService} from "../../shared/rest.service";
import { ToastrService, ToastConfig } from 'ngx-toastr';

@Component({
  selector: 'upload-shabads',
  templateUrl: './upload-shabads.component.html',
  styleUrls: ['./upload-shabads.component.css']
})
export class UploadShabadsComponent implements OnInit {

  raagi_names = [];
  recording_titles = [];
  shabad_english_titles = [];
  shabad_panktis = [];
  shabad_pankti_ids = [];

  recordings_obj = [];
  shabads_obj = [];

  selected_raagi = "";
  selected_recording_title = "";
  selected_recording_url = "";
  selected_shabad_obj = "";
  selected_shabad_english_title = "";
  selected_shabad_url = "";
  selected_shabad_starting_id = 0;
  selected_shabad_ending_id = 0;
  selected_shabad_starting_time = "";
  selected_shabad_ending_time = "";

  more_lines_starting_id = 0;
  more_lines_ending_id = 0;

  shabadsStatus = "";
  delete_recording = false;

  config: ToastConfig = {
    positionClass: 'toast-bottom-full-width',
    tapToDismiss: true,
    timeOut: 7000,
    extendedTimeOut: 20000,
    closeButton: true
  };

  @ViewChild('shabadPlayer') audioPlayerRef: ElementRef;
  jumpToTime = "";

  constructor(private restService: RestService,
              private toastrService: ToastrService) { }

  ngOnInit() {
    this.getRaagiNames();
  }

  onRaagiSelected(value: any){
    this.selected_raagi = value['text'];
    this.restService.getRaagiRecordingsInfo(this.selected_raagi)
      .then(data => this.extractRecordingsObj(data))
      .catch(error => console.log(error));
  }

  onRecordingTitleSelected(value){
    this.selected_recording_title = value.text;
    for(let recordingObj of this.recordings_obj){
      if(recordingObj.recording_title == this.selected_recording_title){
        this.selected_recording_url = recordingObj.recording_url;
      }
    }
    this.restService.getRaagiRecordingShabads(this.selected_raagi, this.selected_recording_title)
      .then(data => this.extractShabadsObj(data))
      .catch(error => console.log(error));
  }

  uploadRecordingToAWS(){
    this.toastrService.warning('', "Please wait while recording is being uploaded...", this.config);
    this.restService.uploadRecording(this.selected_raagi, this.selected_recording_url, this.selected_recording_title)
      .then(data =>  this.toastrService.success('', this.selected_recording_url + ' ==> recording uploaded successfully!', this.config))
      .catch(error =>  this.toastrService.error('', 'Recording uploading failed!', this.config));
  };

  setStatusToPROD(){
    this.restService.setStatusToPROD(this.selected_raagi, this.selected_recording_title)
      .then(data => this.toastrService.success('', 'The status of the shabads under this recording has been set to PROD.', this.config))
      .catch(error => this.toastrService.error('', 'Error setting the status to PRDO', this.config));
  }

  onShabadSelected(value){
    this.shabad_panktis = [];
    this.shabad_pankti_ids = [];
    this.selected_shabad_url = "https://s3.eu-west-2.amazonaws.com/vismaadnaad/Raagis/";
    let selectedShabad = value['text'];
    for(let shabad of this.shabads_obj){
      if(shabad.shabad_english_title === selectedShabad){
        this.selected_shabad_obj = shabad;
      }
    }

    this.selected_shabad_english_title = this.selected_shabad_obj['shabad_english_title'];
    this.selected_shabad_url += this.selected_raagi + "/" + this.selected_shabad_english_title + ".mp3";
    this.selected_shabad_url = this.selected_shabad_url.replace(/ /g, "+");
    this.selected_shabad_starting_id = this.selected_shabad_obj['starting_id'];
    this.selected_shabad_ending_id = this.selected_shabad_obj['ending_id'];
    this.selected_shabad_starting_time = this.selected_shabad_obj['shabad_starting_time'].replace(':', '');
    this.selected_shabad_ending_time = this.selected_shabad_obj['shabad_ending_time'].replace(':', '');

    this.more_lines_starting_id = this.selected_shabad_obj['starting_id'];
    this.more_lines_ending_id = this.selected_shabad_obj['ending_id'];

    this.restService.getRangeLines(this.more_lines_starting_id, this.more_lines_ending_id)
      .then(data => {
        for(let panktiObj of data){
          this.shabad_panktis.push(panktiObj['Gurmukhi']);
          this.shabad_pankti_ids.push(panktiObj['ID']);
        }
      })
      .catch(error => console.log(error));
  }

  showMoreLines(){
    this.shabad_panktis = [];
    this.shabad_pankti_ids = [];
    this.more_lines_starting_id -= 2;
    this.more_lines_ending_id += 2;
    this.restService.getRangeLines(this.more_lines_starting_id, this.more_lines_ending_id)
      .then(data => {
        for(let panktiObj of data){
          this.shabad_panktis.push(panktiObj['Gurmukhi']);
          this.shabad_pankti_ids.push(panktiObj['ID']);
        }
      })
      .catch(error => console.log(error));
  }

  removeExtraLines(){
    this.shabad_panktis = [];
    this.shabad_pankti_ids = [];
    this.more_lines_starting_id = this.selected_shabad_obj['starting_id'];
    this.more_lines_ending_id = this.selected_shabad_obj['ending_id'];
    this.restService.getRangeLines(this.more_lines_starting_id, this.more_lines_ending_id)
      .then(data => {
        for(let panktiObj of data){
          this.shabad_panktis.push(panktiObj['Gurmukhi']);
          this.shabad_pankti_ids.push(panktiObj['ID']);
        }
      })
      .catch(error => console.log(error));
  }

  changeShabadTitle(){
    this.restService.changeShabadTitle(this.selected_shabad_obj['shabad_english_title'], this.selected_shabad_english_title)
      .then(data => this.toastrService.success('', data['Result'].toString(), this.config))
      .catch(error => console.log(error));
  }

  changeStartingID(){
    this.restService.changeStartingID(this.selected_shabad_obj['starting_id'], this.selected_shabad_starting_id)
      .then(data => this.toastrService.success('', data['Result'].toString(), this.config))
      .catch(error => console.log(error));

  }

  changeEndingID(){
    this.restService.changeEndingID(this.selected_shabad_obj['ending_id'], this.selected_shabad_ending_id)
      .then(data => this.toastrService.success('', data['Result'].toString(), this.config))
      .catch(error => console.log(error));
  }

  changeStartingTime(){
    this.restService.changeStartingTime(this.selected_shabad_obj['id'], this.selected_shabad_obj['shabad_starting_time'],
      this.selected_shabad_starting_time.slice(0,2) + ":" + this.selected_shabad_starting_time.slice(2))
      .then(data => this.toastrService.success('', data['Result'].toString(), this.config))
      .catch(error => console.log(error));
  }

  changeEndingTime(){
    this.restService.changeEndingTime(this.selected_shabad_obj['id'], this.selected_shabad_obj['shabad_ending_time'],
      this.selected_shabad_ending_time.slice(0,2) + ":" + this.selected_shabad_ending_time.slice(2))
      .then(data => this.toastrService.success('', data['Result'].toString(), this.config))
      .catch(error => console.log(error));
  }

  uploadShabadToAWS(){
    this.toastrService.warning('', "Please wait while shabad is being uploaded...", this.config);
    this.selected_shabad_obj['shabad_english_title'] = this.selected_shabad_english_title;
    this.selected_shabad_obj['shabad_starting_time'] = this.selected_shabad_starting_time.slice(0,2) + ":" + this.selected_shabad_starting_time.slice(2);
    this.selected_shabad_obj['shabad_ending_time'] = this.selected_shabad_ending_time.slice(0,2) + ":" + this.selected_shabad_ending_time.slice(2);

    this.restService.uploadShabad(this.selected_shabad_obj, this.selected_raagi, this.selected_recording_title)
      .then(data =>  this.toastrService.success('', data.toString(), this.config))
      .catch(error =>  this.toastrService.error('',
        this.selected_shabad_obj['shabad_english_title'] + ' shabad uploading failed!', this.config));
  }

  rewind(){
    this.audioPlayerRef.nativeElement['currentTime'] -= 5;
  }

  forward(){
    this.audioPlayerRef.nativeElement['currentTime'] += 5;
  }

  jumpTo(){
    let time = this.jumpToTime.match(/(.{1,2})/g);
    let sec = (parseInt(time[0]) * 60) + parseInt(time[1]);
    this.audioPlayerRef.nativeElement['currentTime'] = sec;
  }

  private extractRecordingsObj(data){
    this.recordings_obj = data;
    this.recording_titles = [];
    this.recordings_obj = this.recordings_obj.sort(this.compareByDate);
    for(let recordingObj of this.recordings_obj){
      this.recording_titles.push(recordingObj.recording_title);
    }
  }

  private extractShabadsObj(data){
    this.shabads_obj = data;
    this.shabad_english_titles = [];
    for(let shabadObj of data){
      this.shabad_english_titles.push(shabadObj.shabad_english_title);
      this.shabadsStatus = shabadObj['status'];
    }
  }

  getRaagiNames(){
    this.restService.getRaagiNames()
      .then(data => this.raagi_names = data.sort())
      .catch(error => console.log(error));
  }

  //Reverse - by most recent
  private  compareByDate(a,b) {
    if (a.date_added < b.date_added)
      return 1;
    if (a.date_added > b.date_added)
      return -1;
    return 0;
  }

}
