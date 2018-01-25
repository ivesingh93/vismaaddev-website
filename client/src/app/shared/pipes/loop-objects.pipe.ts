import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'loopObjects'
})
export class LoopObjectsPipe implements PipeTransform {

  transform(appObj: any, keyToReturn: string): any {
    return appObj[keyToReturn];
  }

}
