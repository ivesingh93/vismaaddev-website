import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadKathaComponent } from './upload-katha.component';

describe('UploadKathaComponent', () => {
  let component: UploadKathaComponent;
  let fixture: ComponentFixture<UploadKathaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UploadKathaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadKathaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
