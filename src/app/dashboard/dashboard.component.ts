import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, timer, BehaviorSubject } from 'rxjs';
import { takeUntil, debounceTime, switchMap } from 'rxjs/operators';

interface TabContent {
  id: string;
  label: string;
  component: string;
  loading: boolean;
  error?: string;
  data?: any;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('contentPanel', { static: false }) contentPanel?: ElementRef;
  
  private destroy$ = new Subject<void>();
  private tabClickSubject = new BehaviorSubject<number>(0);
  private readonly TAB_STATE_STORAGE_KEY = 'dashboard_tab_state';
  
  tabs: TabContent[] = [
    { id: 'forms', label: 'Forms', component: 'forms', loading: false },
    { id: 'analytics', label: 'Analytics', component: 'analytics', loading: false },
    { id: 'settings', label: 'Settings', component: 'settings', loading: false },
    { id: 'reports', label: 'Reports', component: 'reports', loading: false }
  ];
  
  activeIndex = 0;
  isLoading = false;
  
  constructor(
    private router: Router,
    private messageService: MessageService
  ) {}
  
  ngOnInit(): void {
    this.restoreTabState();
    this.setupTabClickHandler();
    this.setupNavigationHandler();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private setupTabClickHandler(): void {
    // Handle rapid tab clicks with debouncing to prevent race conditions
    this.tabClickSubject.pipe(
      debounceTime(100), // Debounce rapid clicks
      switchMap((index) => this.loadTabContent(index)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (index) => {
        this.finalizeTabSwitch(index);
      },
      error: (error) => {
        this.handleTabError(error);
      }
    });
  }
  
  private setupNavigationHandler(): void {
    // Restore tab state when navigating back to dashboard
    this.router.events.pipe(
      takeUntil(this.destroy$)
    ).subscribe(event => {
      if (event instanceof NavigationEnd && event.url.includes('dashboard')) {
        setTimeout(() => this.restoreTabState(), 100);
      }
    });
  }
  
  onTabChange(event: any): void {
    if (event.index === this.activeIndex) {
      return; // No change needed
    }
    
    // Show loading for the target tab
    this.setTabLoading(event.index, true);
    
    // Use debounced subject to handle rapid clicks
    this.tabClickSubject.next(event.index);
  }
  
  private loadTabContent(index: number): Promise<number> {
    return new Promise((resolve, reject) => {
      // Simulate content loading with potential for null content panel
      timer(500).subscribe(() => {
        try {
          // Check if content panel exists - this addresses issue #1
          if (!this.contentPanel) {
            console.warn('Content panel not found, attempting graceful recovery');
            // Wait a bit and try again
            setTimeout(() => {
              if (!this.contentPanel) {
                throw new Error('Content panel unavailable');
              }
              resolve(index);
            }, 200);
            return;
          }
          
          // Simulate potential loading errors for error handling - addresses issue #2
          if (Math.random() < 0.1) { // 10% chance of error for demonstration
            throw new Error(`Failed to load ${this.tabs[index]?.label} content`);
          }
          
          resolve(index);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  private finalizeTabSwitch(index: number): void {
    this.activeIndex = index;
    this.setTabLoading(index, false);
    this.saveTabState(); // Addresses issue #3 & #6 - maintain tab state
    
    this.messageService.add({
      severity: 'info',
      summary: 'Tab Loaded',
      detail: `${this.tabs[index]?.label} content loaded successfully`
    });
  }
  
  private handleTabError(error: any): void {
    // Error handling and recovery - addresses issue #2
    const currentTab = this.tabs[this.activeIndex];
    if (currentTab) {
      currentTab.error = error.message || 'Failed to load content';
      this.setTabLoading(this.activeIndex, false);
    }
    
    this.messageService.add({
      severity: 'error',
      summary: 'Loading Error',
      detail: error.message || 'Failed to load tab content',
      life: 5000
    });
  }
  
  private setTabLoading(index: number, loading: boolean): void {
    if (this.tabs[index]) {
      this.tabs[index].loading = loading;
      if (loading) {
        this.tabs[index].error = undefined;
      }
    }
  }
  
  private saveTabState(): void {
    // Preserve tab selection state - addresses issue #6
    try {
      const state = {
        activeIndex: this.activeIndex,
        timestamp: Date.now()
      };
      localStorage.setItem(this.TAB_STATE_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save tab state:', error);
    }
  }
  
  private restoreTabState(): void {
    // Maintain tab state when navigating away and back - addresses issue #3
    try {
      const savedState = localStorage.getItem(this.TAB_STATE_STORAGE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);
        // Only restore if state is recent (within last hour)
        if (state.timestamp && (Date.now() - state.timestamp) < 3600000) {
          this.activeIndex = state.activeIndex || 0;
        }
      }
    } catch (error) {
      console.warn('Failed to restore tab state:', error);
      this.activeIndex = 0;
    }
  }
  
  retryLoadContent(): void {
    const currentTab = this.tabs[this.activeIndex];
    if (currentTab && currentTab.error) {
      currentTab.error = undefined;
      this.onTabChange({ index: this.activeIndex });
    }
  }
  
  // Method to simulate navigation away (for testing)
  navigateAway(): void {
    this.router.navigate(['/other-page']);
  }
}