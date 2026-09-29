import { TestBed } from '@angular/core/testing';

import { EmailServiceTsService } from './email.service.ts.service';

describe('EmailServiceTsService', () => {
  let service: EmailServiceTsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmailServiceTsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
