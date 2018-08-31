import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadRecordingsComponent } from './upload-recordings.component';

describe('UploadRecordingsComponent', () => {
  let component: UploadRecordingsComponent;
  let fixture: ComponentFixture<UploadRecordingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UploadRecordingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadRecordingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
