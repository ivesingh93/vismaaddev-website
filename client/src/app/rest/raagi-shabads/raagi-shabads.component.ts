import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {RestService} from "../shared/rest.service";

@Component({
  selector: 'app-raagi-shabads',
  templateUrl: './raagi-shabads.component.html',
  styleUrls: ['./raagi-shabads.component.css']
})
export class RaagiShabadsComponent implements OnInit {

  raagi_names = [];
  shabad_english_titles = [];

  selected_raagi = "";
  selected_shabad_url = "";

  @ViewChild('shabadPlayer') audioPlayerRef: ElementRef;
  jumpToTime = "";

  constructor(private restService: RestService) { }

  ngOnInit() {
    this.getRaagiNames();
  }

  onShabadtitleSelected(value: any){
    this.selected_shabad_url = "https://s3.amazonaws.com/vismaadbani/vismaaddev/Raagis/" + this.selected_raagi + "/" +
      value['text'] + ".mp3";

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

  private extractShabadsByRaagi(data){
    this.shabad_english_titles = [];
    for(let shabadObj of data){
      this.shabad_english_titles.push(shabadObj.shabad_english_title);
    }
  }

  onRaagiSelected(value: any){
    this.selected_raagi = value['text'];
    this.restService.getShabadsByRaagi(this.selected_raagi)
      .then(data => this.extractShabadsByRaagi(data))
      .catch(error => console.log(error));
  }

  getRaagiNames(){
    this.restService.getRaagiNames()
      .then(data => this.raagi_names = data.sort())
      .catch(error => console.log(error));
  }

}
