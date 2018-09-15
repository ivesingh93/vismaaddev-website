import {Component, OnInit} from "@angular/core";
import {RestService} from "../../shared/rest.service";
import {FormArray, FormControl, FormGroup, Validators} from "@angular/forms";
import { DatePickerOptions } from 'ng2-datepicker';
import { ToastrService, ToastConfig } from 'ngx-toastr';

@Component({
  selector: 'recording-form',
  templateUrl: './recording-form.component.html',
  styleUrls: ['./recording-form.component.css']
})
export class RecordingFormComponent implements OnInit {


  editRecording: boolean = false;
  isUploadingShabadsFromLocal: boolean = false;
  fileToUpload: File = null;

  raagiNamesList = [];
  recordingTitleList = [];
  recordingURLList = [];
  shabadsByRaagiList = [];

  existedShabads = [];
  shabadsList = [];
  options: DatePickerOptions;
  recordingForm: FormGroup;

  selectedRaagi = "";
  selectedRecording = "";

  selectedShabads = [];
  sathaayiLines = [];
  startingLines = [];
  endingLines = [];

  selectedShabadSathaayiTitles = [];

  recordingURLAlert = "";

  config: ToastConfig = {
    positionClass: 'toast-bottom-full-width',
    tapToDismiss: true,
    timeOut: 7000,
    extendedTimeOut: 20000,
    closeButton: true
  };

  constructor(private restService: RestService,
              private toastrService: ToastrService){
    this.options = new DatePickerOptions();
    this.options.format = "DD-MM-YYYY";

  }

  ngOnInit(){
    this.getRaagiNames();
    this.getRecordingURLs();
    this.getShabads();

    this.recordingForm = new FormGroup({
      raagiName: new FormControl(null),
      newRaagiName: new FormControl(null, Validators.required),
      recordingTitle: new FormControl(null),
      recordingURL: new FormControl(null),
      recordingDate: new FormControl(null),
      shabads: new FormArray([
        this.initNewShabad()
      ])
    });
  }

  // REST call to GET Raagis and Recordings
  getRaagiNames(){
    let componentThis = this;
    this.restService.getRaagiNames()
      .then(function(data){
        componentThis.raagiNamesList = data;
        componentThis.raagiNamesList.unshift("Add New Raagi");
      })
      .catch(error => console.log(error));
  }

  getRecordingURLs(){
    this.restService.getRecordingURLs()
      .then(data => this.recordingURLList = data)
      .catch(error => console.log(error));
  }

  // REST call to GET Shabads
  getShabads(){
    this.restService.getShabads()
      .then(data => this.extractShabads(data))
      .catch(error => console.log(error));
  }

  // REST call for the lines according to the initials that were passed.
  getLines(index){
    let initials = this.recordingForm.value.shabads[index].initials;
    let componentThis = this;

    this.restService.getLines(initials)
      .then(function(data){
        componentThis.sathaayiLines = [];

        // Loop over the lines and create an object of an each line with its ID, text with gurbani font,
        // the pankti, and kirtan id (to state whether it's a shabad or not)
        for(let i = 0; i < data.length; i++){
          let obj = {
            id: data[i]['ID'],
            text: "<span style='font-family: GurbaniLipi; font-size: 19px'>" + data[i]['Gurmukhi'] + "</span>",
            gurbani_pankti: data[i]['Gurmukhi'],
            kirtan_id: data[i]['Kirtan_ID']
          };
          componentThis.sathaayiLines.push(obj);
        }
      })
      .catch(error => console.log(error));
  }

  onSubmit(){
    this.toastrService.clear();
    let message = this.formValidation();
    let raagiObj = {
      raagi_name: "",
      recordings: []
    };
    let shabadsObj = {
      shabads: []
    };
    let raagi_name = "";
    let newRaagi = false;
    let katha = false;

    if(message){
      this.toastrService.error("", message, this.config);
    }else{
      if(!this.editRecording){
        // Add recording
        let recording_url = this.isUploadingShabadsFromLocal ? "no_recording" : this.recordingForm.value.recordingURL;

        // Get final raagi name, whether existing from a list or a new one.
        for(let i = 0; i < this.getRaagiName().length; i++){
          raagi_name = this.getRaagiName()[0];
          newRaagi = this.getRaagiName()[1];
        }
        raagiObj['raagi_name'] = raagi_name;

        if(recording_url.includes('sgpc')){
          let recording_arr = recording_url.split('/');
          console.log(recording_arr);
          raagiObj['recordings'].push({
            recording_title: recording_arr[recording_arr.length - 1].replace(/%20/g, " ").replace(".mp3", "")
              .replace(/%28/, "(").replace(/%29/, ")"),
            recording_date: recording_url.match(/\d{2}-\d{2}-\d{2}/g)[0],
            recording_url: recording_url,
            shabads: []
          });
        }else if(recording_url.includes('gurmatsagar')){
          raagiObj['recordings'].push({
            recording_title: recording_url.replace("http://www.gurmatsagar.com/files/", "").replace(/%20/g, " ").replace(".mp3", ""),
            recording_date: recording_url.match(/\d{2}-\d{2}-\d{2}/g)[0],
            recording_url: recording_url,
            shabads: []
          });
        }else if(recording_url.includes('gurmatveechar')){
          katha = false;
          raagiObj['recordings'].push({
            recording_title: recording_url.replace("http://www.gurmatveechar.com/audios/Katha/02_Present_Day_Katha/Giani_Sant_Singh_Maskeen/Giani.Sant.Singh.Maskeen--", "")
              .replace('.mp3', '').replace(/\./g,' ') + " - recording",
            recording_url: recording_url,
            shabads: []
          });
        }else if(recording_url === "no_recording"){
          raagiObj['recordings'].push({
            recording_title: recording_url,
            recording_date: new Date(),
            recording_url: recording_url,
            shabads: []
          })
        }
      }

      for (let i = 0; i < this.recordingForm.value.shabads.length; i++) {

        //Check if Shabad Title is null
        let shabadTitle = "";
        let panktiObj;

        if (this.recordingForm.value.shabads[i].shabadTitle[0].text === "Add New Shabad") {
          shabadTitle = this.recordingForm.value.shabads[i].newShabadTitle;
          panktiObj = {
            sathaayi_id: this.recordingForm.value.shabads[i].sathaayiId[0]['id'],
            starting_id: this.recordingForm.value.shabads[i].startingId[0]['id'],
            ending_id: this.recordingForm.value.shabads[i].endingId[0]['id']
          };
        } else {

          shabadTitle = this.recordingForm.value.shabads[i].shabadTitle[0].text;

          //If Shabad selected from an existing list, then add the sathaayi, starting, and ending pankti itself.
          for (let obj of this.existedShabads) {
            if (obj['shabad_english_title'] === shabadTitle) {
              panktiObj = {
                sathaayi_id: obj['sathaayi_id'],
                starting_id: obj['starting_id'],
                ending_id: obj['ending_id']
              };
            }
          }
        }

        let shabadObj = {
          shabad_english_title: this.toTitleCase(shabadTitle),
          shabad_starting_time: this.recordingForm.value.shabads[i].shabadStartingTime,
          shabad_ending_time: this.recordingForm.value.shabads[i].shabadEndingTime,
          sathaayi_id: panktiObj.sathaayi_id,
          starting_id: panktiObj.starting_id,
          ending_id: panktiObj.ending_id,
        };
        if(this.editRecording) {
          shabadsObj.shabads.push(shabadObj);
        }else{

          if(katha){
            console.log(raagiObj);
            console.log(raagiObj['recordings'][0]['recording_title']);
            raagiObj.recordings[0].shabads.push({
              shabad_english_title: (raagiObj['recordings'][0]['recording_title']).replace(' - recording', ''),
              shabad_starting_time: this.recordingForm.value.shabads[i].shabadStartingTime,
              shabad_ending_time: this.recordingForm.value.shabads[i].shabadEndingTime,
              sathaayi_id: 1,
              starting_id: 1,
              ending_id: 3
            })
          }else{
            raagiObj.recordings[0].shabads.push(shabadObj);
          }
        }
      }


      if(this.isUploadingShabadsFromLocal){
        raagiObj.recordings[0].shabads[0]['status'] = "PROD";
        console.log(raagiObj);
        this.restService.addRaagiRecording(raagiObj)
          .then(data => this.restService.uploadShabadFile(this.fileToUpload, raagiObj))
          .catch(error => this.toastrService.error('', 'An error has occurred. Please recheck your submission', this.config));
      }else if(this.editRecording){
        this.restService.addShabadsByRecording(this.selectedRaagi, this.selectedRecording, shabadsObj)
          .then(data => this.toastrService.success('', 'Shabads added successfully!', this.config))
          .catch(error => this.toastrService.error('', 'An error has occurred. Please recheck your submission', this.config));
      }else{

        if(newRaagi){
          this.restService.addRaagiRecording(raagiObj)
            .then(data => this.toastrService.success('', 'Raagi Added Successfully!', this.config))
            .catch(error => this.toastrService.error('', 'An error has occurred. Please recheck your submission', this.config));
        }else{
          this.restService.addRaagiRecording(raagiObj)
            .then(data => this.toastrService.success('', 'Recording Added Successfully!', this.config))
            .catch(error => console.log(error));
        }
      }

    }

  }

  onRecordingURLChange(recordingURL){
    for(let recURL of this.recordingURLList){
      if(recordingURL === recURL){
        this.recordingURLAlert = "Recording URL already exists. Please enter a new recording.";
        break;
      }else{
        this.recordingURLAlert = "";
      }
    }
  }

  onEditRecording(){
    this.editRecording = !this.editRecording;
    this.isUploadingShabadsFromLocal = false;
  }

  onUploadingShabadsFromLocal(){
    this.isUploadingShabadsFromLocal = !this.isUploadingShabadsFromLocal;
    this.editRecording = false;
  }

  handleFileInput(files: FileList) {
    this.fileToUpload = files.item(0);
  }

  // When sathayi is selected, process starting lines array.
  onLineSelected(value: any){
    let sathaayi_id = value.id;
    let selected = {
      id: sathaayi_id,
      from: sathaayi_id - 20,
      to: sathaayi_id + 20,
      gurmukhi: value.text
    };

    // Check whether the selected line or sathayi has Kirtan ID or is null
    let kirtan_id = null;
    for(let i = 0; i < this.sathaayiLines.length; i++){
      if(this.sathaayiLines[i]['id'] === value.id){
        kirtan_id = this.sathaayiLines[i]['kirtan_id'];
        break;
      }
    }

    // If shabad by this sathaayi_id already exists then no need to enter the New Shabad Title or select starting/ending pankti.
    this.restService.getShabadBySathaayiID(sathaayi_id)
      .then(data => {

        /*
            If the selected shabad sathaayi id is not found in the database (shabad_info table) then do either of the following:
              1. If the selected shabad sathaayi id has kirtan id (is a kirtan shabad) then just pull those lines
              2. If the selected shabad sathaayi id does not have kirtan id then just pull 20 lines before and after the selected shabad sathaayi

            If the selected shabad sathaayi id is found in the database then this means this shabad sathaayi id already has title(s). If so, then:
              Show the list of titles that are under this shabad id and the admin can pick one from the given dropdown or proceed with a new title.

         */
        if(data === "Shabad not found"){
          this.selectedShabadSathaayiTitles = [];
          this.prepareLines(kirtan_id, selected);
        }else{
          data.map(shabad => {
            this.selectedShabadSathaayiTitles = [];
            this.selectedShabadSathaayiTitles.push(shabad.shabad_english_title);
          });
          this.prepareLines(kirtan_id, selected);
        }
      })
      .catch(error => console.log(error));

  }

  // When starting line is selected, process ending lines.
  onStartingPanktiSelected(value: any, index){
    this.endingLines = [];
    for(let i = 0; i < this.startingLines.length; i++){

      // Insert only those lines that are after the starting line.
      if(this.startingLines[i]['id'] >= value.id){
        this.endingLines.push(this.startingLines[i]);
      }
    }
  }

  // Remove the current shabad control/row when 'x' is clicked
  onRemoveShabad(index: number){
    const control = <FormArray>this.recordingForm.controls['shabads'];
    control.removeAt(index);
    this.selectedShabads.splice(index, 1);
  }

  // Add a new shabad control/row when 'Add New Shabad' is clicked
  onAddNewShabad(){
    const control = <FormArray>this.recordingForm.controls['shabads'];
    control.push(this.initNewShabad());
  }

  // Set selectedRaagi to a value that's selected, only if raagi already exists.
  onRaagiSelected(value: any){
    this.editRecording = false;
    this.selectedRaagi = value['text'];
    if(this.selectedRaagi !== "Add New Raagi"){
      // Add RecordingTitles to the list by selected Raagi
      this.restService.getRecordingsByRaagi(this.selectedRaagi)
        .then(data => this.recordingTitleList = data)
        .catch(error => console.log(error));

      this.restService.getShabadsByRaagi(this.selectedRaagi)
        .then(data => this.shabadsByRaagiList = data)
        .catch(error => console.log(error));
    }

  }

  onRecordingTitleSelected(value){
    this.selectedRecording = value.text;
    console.log(this.selectedRecording);
  }

  // Set selectedShabads to a value that's selected, only if shabad already exists.
  onShabadSelected(value: any, index){
    this.selectedShabads[index] = value['text'];

    // Check if the selected raagi has the current selected shabad. If so, then set the starting/ending time: 00:00
    if(this.selectedRaagi){
      for(let i = 0; i < this.shabadsByRaagiList.length; i++){
        if(this.shabadsByRaagiList[i].shabad_english_title === this.selectedShabads[index]){
          this.toastrService.warning('', this.selectedShabads[index] + ' shabad already exists of this raagi. ' +
            'Starting/Ending time has been set to 00:00', this.config);
          this.recordingForm.controls['shabads']['controls'][index]['controls']['shabadStartingTime'].setValue("00:00");
          this.recordingForm.controls['shabads']['controls'][index]['controls']['shabadEndingTime'].setValue("00:00");
          break;
        }
      }

    }
  }

  private prepareLines(kirtan_id: number, selected){
    //If the selected line or sathayi has Kirtan ID, then grab just those lines.
    if(kirtan_id !== null){
      this.restService.getShabadLines(kirtan_id)
        .then(data => {
          this.processStartingLines(selected, data);
        })
        .catch(error => console.log(error));
    }else{
      // Otherwise, grab the lines within the range.

      this.restService.getRangeLines(selected.from, selected.to)
        .then(data => {
          this.processStartingLines(selected, data);
        })
        .catch(error => console.log(error));
    }
  }

  // Taken from Stackoverflow
  private toTitleCase(str) {

    return str.replace(/\w\S*/g,
      function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  private formValidation(){
    let message = "";

    if(this.recordingForm.value.raagiName === null){
      message = "Please select a Raagi Name or select Add New Recording. ";
    }else if(this.recordingForm.value.raagiName[0].text === "Add New Raagi" && (this.recordingForm.value.newRaagiName === null
        || this.recordingForm.value.newRaagiName === "")){
      message = "Please enter the New Raagi Name. ";
    }else if(this.recordingForm.value.raagiName[0].text === "Add New Raagi" && this.raagiNamesList.includes(this.recordingForm.value.newRaagiName)) {
      message = this.recordingForm.value.newRaagiName + " already exists. "
    }else{
      if(this.editRecording && (this.selectedRecording === null || this.selectedRecording === "")){
        message = "Please select a Recording Title to edit. ";
      }else {
        let recordingURL = this.recordingForm.value.recordingURL;

        if(this.isUploadingShabadsFromLocal){
          recordingURL = "no_recording";
        }

        if(!this.editRecording && !this.isUploadingShabadsFromLocal && ((recordingURL === null) || (recordingURL === "")
          || (!recordingURL.endsWith(".mp3")))) {
          message = "Please recheck the Recording URL field. Make sure the link starts with either http://www.gurmatsagar.com/ or http://new.sgpc.net" +
            " or http://www.gurmatveechar.com/ and ends with .mp3. ";
          console.log(recordingURL);
        }else{

          console.log(recordingURL);
          if((this.editRecording && recordingURL == null) || (recordingURL === "no_recording")){
            if(this.recordingForm.value.shabads[0].shabadTitle === null){
              message = "Please select a Shabad Title or select Add New Shabad from Shabad 1. ";
            }else {
              for (let i = 0; i < this.recordingForm.value.shabads.length; i++) {
                //Check if Shabad Title is null
                if (this.recordingForm.value.shabads[i].shabadTitle === null) {
                  message = "Please select a Shabad Title or select Add New Shabad in Shabad " + (i + 1) + ". ";
                  break;

                  //Check if Shabad Title is selected to Add New Shabad AND New Shabad Title is either null or blank
                } else if ((this.recordingForm.value.shabads[i].shabadTitle[0].text === "Add New Shabad")
                  && (this.recordingForm.value.shabads[i].newShabadTitle === null || this.recordingForm.value.shabads[i].newShabadTitle === "")) {
                  message = "Please enter a New Shabad Title in Shabad " + (i + 1) + ". ";
                  break;

                  //If neither, then get the Shabad Title
                } else if(this.recordingForm.value.shabads[i].shabadTitle[0].text === "Add New Shabad"
                  && this.shabadsList.includes(this.recordingForm.value.shabads[i].newShabadTitle)){
                  message = this.recordingForm.value.shabads[i].newShabadTitle + " already exists.";
                } else {
                  // Check if any of the field is blank.
                  let shabadErrorMessage = this.validateShabadInputs(i);
                  console.log(shabadErrorMessage);
                  if (shabadErrorMessage.length) {
                    message = shabadErrorMessage + "in Shabad " + (i + 1) + ". ";
                    break;
                  }
                }
              }
            }
          }else if((!recordingURL.includes("http://www.gurmatsagar.com/")) || (!recordingURL.includes("sgpc.net")) ||
            (!recordingURL.includes("http://www.gurmatveechar.com/")) ){
            // Shabads
            if(this.recordingForm.value.shabads[0].shabadTitle === null){
              message = "Please select a Shabad Title or select Add New Shabad from Shabad 1. ";
            }else {
              for (let i = 0; i < this.recordingForm.value.shabads.length; i++) {
                //Check if Shabad Title is null
                if (this.recordingForm.value.shabads[i].shabadTitle === null) {
                  message = "Please select a Shabad Title or select Add New Shabad in Shabad " + (i + 1) + ". ";
                  break;

                  //Check if Shabad Title is selected to Add New Shabad AND New Shabad Title is either null or blank
                } else if ((this.recordingForm.value.shabads[i].shabadTitle[0].text === "Add New Shabad")
                  && (this.recordingForm.value.shabads[i].newShabadTitle === null || this.recordingForm.value.shabads[i].newShabadTitle === "")) {
                  message = "Please enter a New Shabad Title in Shabad " + (i + 1) + ". ";
                  break;

                  //If neither, then get the Shabad Title
                } else if(this.recordingForm.value.shabads[i].shabadTitle[0].text === "Add New Shabad"
                  && this.shabadsList.includes(this.recordingForm.value.shabads[i].newShabadTitle)){
                  message = this.recordingForm.value.shabads[i].newShabadTitle + " already exists.";
                } else {
                  // Check if any of the field is blank.
                  let shabadErrorMessage = this.validateShabadInputs(i);
                  console.log(shabadErrorMessage);
                  if (shabadErrorMessage.length) {
                    message = shabadErrorMessage + "in Shabad " + (i + 1) + ". ";
                    break;
                  }
                }
              }
            }
          }else{
            console.log(recordingURL);
            message = "Please recheck the Recording URL field. Make sure the link starts with either http://www.gurmatsagar.com/ or http://new.sgpc.net" +
              " or http://www.gurmatveechar.com and ends with .mp3. ";
          }
        }
      }
    }

    return message;
  }

  private validateShabadInputs(index){
    let message = "";
    if(this.recordingForm.value.shabads[index].shabadStartingTime === null
      || this.recordingForm.value.shabads[index].shabadStartingTime === ""){
        message = "Please enter the Shabad Starting Time ";
    }else{
      if(this.recordingForm.value.shabads[index].shabadEndingTime === null
        || this.recordingForm.value.shabads[index].shabadEndingTime === ""){
          message = "Please enter the Shabad Ending Time ";
      }else{
        if(this.recordingForm.value.shabads[index].shabadTitle[0].text === "Add New Shabad"){
          if(this.recordingForm.value.shabads[index].initials === null
            || this.recordingForm.value.shabads[index].initials === ""){
            message = "Please enter the Initials ";
          }else{
            if(this.recordingForm.value.shabads[index].sathaayiId === null){
              message = "Please select the Shabad Sathaayi ";
            }else{
              if(this.recordingForm.value.shabads[index].startingId === null){
                message = "Please select the Starting Pankti ";
              }else{
                if(this.recordingForm.value.shabads[index].endingId === null){
                  message = "Please select the Ending Pankti ";
                }
              }
            }
          }
        }
      }
    }
    return message;
  }

  // Process dropdown for starting lines array.
  private processStartingLines(selected, data) {
    // Empty the array to avoid elements from previous search.
    this.startingLines = [];

    for (let i = 0; i < data.length; i++) {
      let pankti = "";

      // Highlight the selected line or sathayi.
      if (selected.id === data[i]['ID']) {
        pankti = "<span style='font-family: GurbaniLipi; font-size: 19px; color: red'>" + data[i]['Gurmukhi'] + "</span>"
      } else {
        pankti = "<span style='font-family: GurbaniLipi; font-size: 19px;'>" + data[i]['Gurmukhi'] + "</span>"

      }

      // Prepare an object for picking a starting line from startingLines array
      let obj = {
        id: data[i]['ID'],
        text: pankti,
        pankti: data[i]['Gurmukhi']
      };
      this.startingLines.push(obj);
    }
    console.log()
  }

  // Get final raagi name, whether it's from the existing list or a new one.
  private getRaagiName(){
    if(this.recordingForm.value.raagiName[0].text == 'Add New Raagi'){
      return [this.recordingForm.value.newRaagiName, true];
    }else{
      return [this.recordingForm.value.raagiName[0].text, false];
    }
  }

  // Get all the shabads that already exists in the database
  private extractShabads(data){
    for(let shabadObj of data){
      this.existedShabads.push(shabadObj);
      this.shabadsList.push(shabadObj.shabad_english_title);
    }
    this.shabadsList.unshift("Add New Shabad");
  }

  // Add a new control
  private initNewShabad(){
    return new FormGroup({
      shabadTitle: new FormControl(null),
      newShabadTitle: new FormControl(null),
      shabadUrl: new FormControl(null),
      initials: new FormControl(null),
      fileName: new FormControl(null),
      shabadStartingTime: new FormControl(null),
      shabadEndingTime: new FormControl(null),
      sathaayiId: new FormControl(null),
      startingId: new FormControl(null),
      endingId: new FormControl(null)
    });
  }

}
