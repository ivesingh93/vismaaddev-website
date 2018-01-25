import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'keysValue'
})
export class KeysValuePipe implements PipeTransform {

  transform(value: any): any {
    let keys_value = [];
    for(let key in value){
      keys_value.push({
        key: key,
        value: value[key]
      });
    }

    return keys_value;
  }

}
