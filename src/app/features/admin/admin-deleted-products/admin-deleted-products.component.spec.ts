import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDeletedProductsComponent } from './admin-deleted-products.component';

describe('AdminDeletedProductsComponent', () => {
  let component: AdminDeletedProductsComponent;
  let fixture: ComponentFixture<AdminDeletedProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDeletedProductsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDeletedProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
