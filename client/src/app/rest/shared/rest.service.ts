import {Injectable} from '@angular/core';
import {Http, Response, Headers, RequestOptions} from '@angular/http';
import 'rxjs/add/operator/toPromise';

@Injectable()
export class RestService{
  //http://localhost:3000
  private LOCALHOST = "";

  private RAAGIS_URL = this.LOCALHOST +  "/api/raagiRoutes/raagis";
  private ADD_RAAGI_RECORDING_URL = this.LOCALHOST +  "/api/raagiRoutes/addRaagiRecording";
  private GET_LINES_URL = this.LOCALHOST +  "/api/sggsRoutes/linesWithInitials/";
  private GET_RANGE_LINES = this.LOCALHOST +  "/api/sggsRoutes/linesFrom/";
  private GET_SHABAD_LINES = this.LOCALHOST +  "/api/sggsRoutes/shabadLines/"
  private GET_SHABADS_URL = this.LOCALHOST +  "/api/raagiRoutes/shabads";
  private GET_RECORDINGS_BY_RAAGI = this.LOCALHOST +  "/api/raagiRoutes/raagis/";
  private ADD_SHABADS_BY_RECORDING = this.LOCALHOST +  "/api/raagiRoutes/raagis/";
  private GET_SHABADS_BY_RAAGI = this.LOCALHOST +  "/api/raagiRoutes/raagis/";
  private GET_RAAGI_NAMES = this.LOCALHOST + "/api/raagiRoutes/raagiNames";
  private GET_RECORDING_URLS = this.LOCALHOST + "/api/raagiRoutes/recordingURLs";
  private GET_RAAGI_RECORDING_SHABADS = this.LOCALHOST + "/api/raagiRoutes/raagis/";
  private GET_RAAGI_RECORDINGS_INFO = this.LOCALHOST + "/api/raagiRoutes/raagis/";
  private UPLOAD_RECORDING = this.LOCALHOST + "/api/raagiRoutes/uploadRecording";
  private UPLOAD_SHABAD = this.LOCALHOST + "/api/raagiRoutes/uploadShabad";
  private CHANGE_SHABAD_TITLE = this.LOCALHOST + "/api/raagiRoutes/changeShabadTitle";
  private CHANGE_STARTING_ID = this.LOCALHOST + "/api/raagiRoutes/changeStartingID";
  private CHANGE_ENDING_ID = this.LOCALHOST + "/api/raagiRoutes/changeEndingID";
  private GET_SHABAD_BY_SATHAAYI_ID = this.LOCALHOST + "/api/raagiRoutes/shabads/";
  private GET_SHABAD_BY_SATHAAYI_TITLE = this.LOCALHOST + "/api/raagiRoutes/shabads/sathaayi_title/";
  private GET_SHABADS_WITH_NO_THEMES = this.LOCALHOST + "/api/raagiRoutes/shabadsWithNoThemes";
  private SET_STATUS_TO_PROD = this.LOCALHOST + "/api/raagiRoutes/setStatusToPROD";
  private ADD_SHABAD_THEMES = this.LOCALHOST + "/api/raagiRoutes/addShabadThemes/";
  private GET_RECENT_RECORDINGS = this.LOCALHOST + "/api/raagiRoutes/recentRecordings";
  private GET_SHABADS_RECORDING = this.LOCALHOST + "/api/raagiRoutes/recordings";
  private GET_SHABAD_THEMES = this.LOCALHOST + "/api/raagiRoutes/shabads/";
  constructor(private http: Http){}

  addRaagiRecording(raagi_obj){
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.post(this.ADD_RAAGI_RECORDING_URL, raagi_obj, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  getLines(initials: string): Promise<any>{
    return this.http.get(this.GET_LINES_URL + initials)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  getShabadLines(kirtanId: number): Promise<any>{
    return this.http.get(this.GET_SHABAD_LINES + kirtanId)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  getRangeLines(from: number, to: number): Promise<any>{
    return this.http.get(this.GET_RANGE_LINES + from + "/linesTo/" + to)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  getShabads(): Promise<any>{
    return this.http.get(this.GET_SHABADS_URL)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);

  }

  addShabadThemes(shabad_english_title, themes){
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });


    return this.http.put(this.ADD_SHABAD_THEMES + shabad_english_title, themes, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  getShabadBySathaayiID(sathaayiID): Promise<any>{
    return this.http.get(this.GET_SHABAD_BY_SATHAAYI_ID + sathaayiID)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  getShabadBySathaayiTitle(sathaayi_title): Promise<any>{
    return this.http.get(this.GET_SHABAD_BY_SATHAAYI_TITLE + sathaayi_title)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  getRecordingsByRaagi(raagiName: string): Promise<any>{
    return this.http.get(this.GET_RECORDINGS_BY_RAAGI + raagiName + "/recordings")
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  getRaagiRecordingsInfo(raagiName: string): Promise<any>{
    return this.http.get(this.GET_RAAGI_RECORDINGS_INFO + raagiName + "/recordingsInfo")
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  getShabadsByRaagi(raagiName: string): Promise<any>{
    return this.http.get(this.GET_SHABADS_BY_RAAGI + raagiName + "/shabads")
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  addShabadsByRecording(raagiName: string, recordingTitle: string, shabads_obj: any){
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    return this.http.put(this.ADD_SHABADS_BY_RECORDING + raagiName + "/recordings/" + recordingTitle + "/addShabads",
      shabads_obj, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  uploadRecording(raagi_name, recording_url, recording_title){
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    let recordingObj = {
      raagi_name: raagi_name,
      recording_url: recording_url,
      recording_title: recording_title
    };

    return this.http.post(this.UPLOAD_RECORDING,
      recordingObj, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  setStatusToPROD(raagi_name, recording_title){
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    let recordingObj = {
      raagi_name: raagi_name,
      recording_title: recording_title
    };

    return this.http.put(this.SET_STATUS_TO_PROD, recordingObj, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  uploadShabad(shabadObj, raagi_name, recording_title){
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    let obj = {
      shabad: shabadObj,
      raagi_name: raagi_name,
      recording_title: recording_title
    };

    return this.http.post(this.UPLOAD_SHABAD,
      obj, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  getRaagiNames(): Promise<any>{
    return this.http.get(this.GET_RAAGI_NAMES)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);

  }

  getRecordingURLs(): Promise<any>{
    return this.http.get(this.GET_RECORDING_URLS)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);

  }

  getRecentRecordings(): Promise<any>{
    return this.http.get(this.GET_RECENT_RECORDINGS)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);

  }

  getShabadThemes(sathaayi_id: number): Promise<any>{
    return this.http.get(this.GET_SHABAD_THEMES + "/" + sathaayi_id + "/themes")
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  getShabadsByRecording(recording_title: string): Promise<any>{
    return this.http.get(this.GET_SHABADS_RECORDING + "/" + recording_title + "/shabads")
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  getRaagiRecordingShabads(raagi_name: string, recording_title: string): Promise<any>{
    return this.http.get(this.GET_RAAGI_RECORDING_SHABADS + raagi_name + "/recordings/" + recording_title + "/shabads")
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  changeShabadTitle(old_shabad_english_title, new_shabad_english_title){
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    let obj = {
      old_shabad_english_title: old_shabad_english_title,
      new_shabad_english_title: new_shabad_english_title
    };

    return this.http.put(this.CHANGE_SHABAD_TITLE, obj, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  changeStartingID(original_starting_id, new_starting_id){
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    let obj = {
      original_starting_id: original_starting_id,
      new_starting_id: new_starting_id
    };

    return this.http.put(this.CHANGE_STARTING_ID, obj, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  changeEndingID(original_ending_id, new_ending_id){
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({ headers: headers });

    let obj = {
      original_ending_id: original_ending_id,
      new_ending_id: new_ending_id
    };

    return this.http.put(this.CHANGE_ENDING_ID, obj, options)
      .toPromise()
      .then(this.extractData)
      .catch(this.handleError);
  }

  private extractData(responseSerialized: Response): Promise<any>{
    let response = responseSerialized.json();
    return Promise.resolve(response);
  }

  private handleError(error:any):Promise<any>{
    console.log(error);
    return Promise.reject("An error occurred. Please check the last operation again.");
  }

}
