import { Component, OnInit } from '@angular/core';
import {RestService} from "../../shared/rest.service";
import {ToastrService} from "ngx-toastr";
import {FormControl, FormGroup} from "@angular/forms";

@Component({
  selector: 'app-upload-recordings',
  templateUrl: './upload-recordings.component.html',
  styleUrls: ['./upload-recordings.component.css']
})
export class UploadRecordingsComponent implements OnInit {

  raagiNamesList:Array<String> = [];
  recordingForm;
  newRaagi: boolean = false;


  constructor(private restService: RestService,
              private toastrService: ToastrService) { }

  ngOnInit() {
    this.getRaagiNames();
    this.recordingForm = new FormGroup({
      raagiName: new FormControl(null),
      newRaagiName: new FormControl(null),
      recordingPath: new FormControl(null)
    });
  }

  private getRaagiNames(){
    let componentThis = this;
    this.restService.getRaagiNames()
      .then(data => {
        componentThis.raagiNamesList = data;
        componentThis.raagiNamesList.unshift("Add New Raagi");
      })
      .catch(error => console.log(error));
  }

  private onRaagiSelected(value: any){
    if(value.text === "Add New Raagi"){
      this.newRaagi = true;
    }else{
      this.newRaagi = false;
    }
  }

  onSubmit(){
    let raagiName: string;
    if(this.newRaagi){
      raagiName = this.recordingForm.value.newRaagiName;
    }else{
      raagiName = this.recordingForm.value.raagiName[0].text;
    }
    console.log(raagiName);
  }

}
