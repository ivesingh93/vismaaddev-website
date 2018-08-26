import { Component, OnInit } from '@angular/core';
import {ToastConfig, ToastrService} from "ngx-toastr";
import {FormControl, FormGroup} from "@angular/forms";
import {KathaService} from "../../shared/katha.service";

@Component({
  selector: 'app-upload-katha',
  templateUrl: './upload-katha.component.html',
  styleUrls: ['./upload-katha.component.css']
})
export class UploadKathaComponent implements OnInit {

  selectedKathaVaachak: string;
  kathaVaachaks = [];
  kathaForm: FormGroup;
  config: ToastConfig = {
    positionClass: 'toast-bottom-full-width',
    tapToDismiss: true,
    timeOut: 7000,
    extendedTimeOut: 20000,
    closeButton: true
  };

  constructor(private kathaService: KathaService, private toastrService: ToastrService) { }

  ngOnInit() {
    this.kathaForm = new FormGroup({
      kathaVaachak: new FormControl(null),
      newKathaVaachak: new FormControl(null),
      kathaTitle: new FormControl(null),
      kathaUrl: new FormControl(null)
    });
  }

  onKathaVaachakSelected(event){

  }
}
