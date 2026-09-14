import { Component, inject, OnInit, OnDestroy, PLATFORM_ID, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { loadProducts } from '../../store/products/products.actions';
import { selectFeaturedProducts } from '../../store/products/products.selectors';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NavbarComponent,FooterComponent,RouterLink,AsyncPipe,ProductCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private platformId = inject(PLATFORM_ID);
  private elementRef = inject(ElementRef);
  featuredProducts = this.store.select(selectFeaturedProducts);

  heroImages: string[] = [
    'images/hero/hero3.jpg.jpg',
    'images/hero/hero4.jpg.jpg',
  ];
  currentHeroIndex = 0;
  private heroInterval?: ReturnType<typeof setInterval>;

  videoSrc = 'videos/vid2.mp4.mp4';
  // videoSrc = 'videos/vdo1.mp4.mp4';
  videoPoster = 'images/hero/BG.jpg.jpg';

  private scrollObserver?: IntersectionObserver;

  constructor() {
    this.store.dispatch(loadProducts());
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.heroInterval = setInterval(() => {
        this.currentHeroIndex = (this.currentHeroIndex + 1) % this.heroImages.length;
      }, 5000);

      this.setupScrollReveal();
    }
  }

  private setupScrollReveal() {
    const sections = this.elementRef.nativeElement.querySelectorAll('.reveal-on-scroll');

    this.scrollObserver = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            this.scrollObserver?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 }
    );

    sections.forEach((section: Element) => this.scrollObserver?.observe(section));
  }

  ngOnDestroy() {
    if (this.heroInterval) {
      clearInterval(this.heroInterval);
    }
    this.scrollObserver?.disconnect();
  }
}