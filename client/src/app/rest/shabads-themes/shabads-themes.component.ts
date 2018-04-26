import { Component, OnInit } from '@angular/core';
import {ToastConfig, ToastrService} from "ngx-toastr";
import {RestService} from "../shared/rest.service";

@Component({
  selector: 'app-shabads-themes',
  templateUrl: './shabads-themes.component.html',
  styleUrls: ['./shabads-themes.component.css']
})
export class ShabadsThemesComponent implements OnInit {

  shabads_obj = [];
  shabad_english_titles = [];

  selected_shabad_rows = [];
  selected_shabad_obj = {};

  selected_shabad_english_title = "";
  selected_shabad_ang = 0;

  private selected_themes = [];
  private themes:Array<string> = ["Bani & Satsangat", "Maaya & Moh", "Ustath & Akath Katha", "Hauumain & Vicchodda",
    "Naam Rass & Simran", "Sharan & Bhaanna", "Benti & Ardaas", "Milaap & Anand", "Sukh & Sehaj", "Kirtan & Har Jass",
    "Sevak & Seva", "Bhagat & Bhagti", "Mann & Jindh", "Janam Maran & Maanas Janam", "Kirpa & Mehar", "Guru Ustat & Vaara",
    "Viraag & Milaap", "Manmukh & Gurmukh", "Gursikhi & Nimarta", "Baksh Laye & Sharan", "Ninda & Saakat Sang", "Payaas & Darshan"
  ];

  config: ToastConfig = {
    positionClass: 'toast-bottom-full-width',
    tapToDismiss: true,
    timeOut: 7000,
    extendedTimeOut: 20000,
    closeButton: true
  };

  constructor(private restService: RestService,
              private toastrService: ToastrService) { }

  ngOnInit() {
    this.restService.getShabadsWithNoThemes()
      .then(data => this.extractShabadsObj(data))
      .catch(error => console.log(error));
  }


  public onShabadSelected(value){
    let selectedShabad = value['text'];
    for(let shabad of this.shabads_obj){
      if(shabad.shabad_english_title === selectedShabad){
        this.selected_shabad_obj = shabad;
      }
    }

    this.selected_shabad_english_title = this.selected_shabad_obj['shabad_english_title'];

    let componentThis = this;
    this.restService.getRangeLines(this.selected_shabad_obj['starting_id'], this.selected_shabad_obj['ending_id'])
      .then(function(data){
        componentThis.selected_shabad_rows = data;
        componentThis.selected_shabad_ang = data[0]['Ang'];

      })
      .catch(error => console.log(error));
  }

  public refreshValue(value:any):void {
    this.selected_themes = value;
    console.log(this.selected_themes);
  }

  public submitThemes(){
    let themes = [];
    for(let i = 0; i < this.selected_themes.length; i++){
      themes.push(this.selected_themes[i]['text']);
    }

    if(!this.selected_shabad_english_title && themes.length == 0){
      this.toastrService.error('', 'Please make sure shabad is selected and at least one theme is selected!', this.config)
    }else if(!this.selected_shabad_english_title){
      this.toastrService.error('', 'Please make sure shabad is selected!', this.config)
    }else if(themes.length == 0){
      this.toastrService.error('', 'Please make sure at least one theme is selected!', this.config)
    }else{
      this.restService.addShabadThemes(this.selected_shabad_english_title, {themes: themes})
        .then(data => this.toastrService.success('', 'Shabad themes successfully added', this.config))
        .catch(error => this.toastrService.error('', 'Error submitting shabad themes', this.config));
    }
  }

  private extractShabadsObj(data){
    this.shabads_obj = data;
    this.shabad_english_titles = [];
    for(let shabadObj of data){
      this.shabad_english_titles.push(shabadObj.shabad_english_title);
    }
  }
}
