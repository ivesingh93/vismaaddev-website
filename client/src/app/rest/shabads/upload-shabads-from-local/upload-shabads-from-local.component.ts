import { Component, OnInit } from '@angular/core';
import {RestService} from "../../shared/rest.service";
import {ToastrService} from "ngx-toastr";
import {FormArray, FormControl, FormGroup} from "@angular/forms";

@Component({
  selector: 'app-upload-shabads-from-local',
  templateUrl: './upload-shabads-from-local.component.html',
  styleUrls: ['./upload-shabads-from-local.component.css']
})
export class UploadShabadsFromLocalComponent implements OnInit {

  uploadShabadsForm;
  raagiList: Array<String> = [];
  shabadsList: Array<String> = [];
  isNewRaagi: boolean = false;

  constructor(
    private restService: RestService,
    private toastrService: ToastrService

  ) { }

  ngOnInit() {
    this.uploadShabadsForm = new FormGroup({
      raagiName: new FormControl(null),
      newRaagiName: new FormControl(null),
      shabads: new FormArray([
        this.initNewShabad()
      ])

    });
    this.restService.getRaagiNames().then(data => {
        this.raagiList = data;
        this.raagiList.unshift("Add New Raagi");
      }).catch(error => console.log(error));
    this.restService.getShabads().then(data => {
      for(let shabadObj of data){
        this.shabadsList.push(shabadObj.shabad_english_title);
      }
      this.shabadsList.unshift("Add New Shabad");
    }).catch(error => console.log(error));
  }

  private initNewShabad(){
    return new FormGroup({
      shabadTitle: new FormControl(null),
      newShabadTitle: new FormControl(null),
      initials: new FormControl(null),
      shabadStartingTime: new FormControl(null),
      shabadEndingTime: new FormControl(null),
      sathaayiId: new FormControl(null),
      startingId: new FormControl(null),
      endingId: new FormControl(null)
    });
  }

  private onRaagiSelected(value: any){
    return (value.text === "Add New Raagi" ? this.isNewRaagi = true : this.isNewRaagi = false)
  }

  onSubmit(){
    let raagiName: string;
    this.isNewRaagi ? raagiName = this.uploadShabadsForm.value.newRaagiName : raagiName = this.uploadShabadsForm.value.raagiName[0].text;
    console.log(raagiName);
  }

}
