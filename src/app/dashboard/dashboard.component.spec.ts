import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, Subject } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { DashboardComponent } from './dashboard.component';
import { TabViewModule } from 'primeng/tabview';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let routerEventsSubject: Subject<any>;

  beforeEach(async () => {
    routerEventsSubject = new Subject();
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      events: routerEventsSubject.asObservable()
    });
    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);

    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      imports: [
        BrowserAnimationsModule,
        TabViewModule,
        ButtonModule,
        ProgressSpinnerModule,
        ToastModule
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: MessageService, useValue: messageServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockMessageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
    
    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem');
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default tab state', () => {
    expect(component.activeIndex).toBe(0);
    expect(component.tabs.length).toBe(4);
    expect(component.tabs[0].id).toBe('forms');
  });

  it('should not change tab if same index is selected', () => {
    component.activeIndex = 1;
    spyOn(component, 'setTabLoading');
    
    component.onTabChange({ index: 1 });
    
    expect(component.setTabLoading).not.toHaveBeenCalled();
  });

  it('should set loading state when changing tabs', () => {
    const newIndex = 1;
    
    component.onTabChange({ index: newIndex });
    
    expect(component.tabs[newIndex].loading).toBe(true);
  });

  it('should save and restore tab state', () => {
    const testState = { activeIndex: 2, timestamp: Date.now() };
    (localStorage.getItem as jasmine.Spy).and.returnValue(JSON.stringify(testState));
    
    component['restoreTabState']();
    expect(component.activeIndex).toBe(2);
    
    component.activeIndex = 3;
    component['saveTabState']();
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'dashboard_tab_state',
      jasmine.any(String)
    );
  });

  it('should not restore stale tab state', () => {
    const staleState = { 
      activeIndex: 2, 
      timestamp: Date.now() - 4000000 // 4 hours ago
    };
    (localStorage.getItem as jasmine.Spy).and.returnValue(JSON.stringify(staleState));
    
    component['restoreTabState']();
    expect(component.activeIndex).toBe(0); // Should use default
  });

  it('should retry loading content when retry is called', () => {
    component.tabs[1].error = 'Test error';
    component.activeIndex = 1;
    
    spyOn(component, 'onTabChange');
    
    component.retryLoadContent();
    
    expect(component.tabs[1].error).toBeUndefined();
    expect(component.onTabChange).toHaveBeenCalledWith({ index: 1 });
  });

  it('should navigate away when navigateAway is called', () => {
    component.navigateAway();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/other-page']);
  });

  it('should handle navigation events', () => {
    spyOn(component, 'restoreTabState' as any);
    
    routerEventsSubject.next(new NavigationEnd(1, '/dashboard', '/dashboard'));
    
    // Wait for setTimeout
    setTimeout(() => {
      expect(component['restoreTabState']).toHaveBeenCalled();
    }, 150);
  });

  it('should clean up subscriptions on destroy', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');
    
    component.ngOnDestroy();
    
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  it('should handle localStorage errors gracefully', () => {
    spyOn(console, 'warn');
    (localStorage.getItem as jasmine.Spy).and.throwError('Storage error');
    
    component['restoreTabState']();
    
    expect(console.warn).toHaveBeenCalledWith('Failed to restore tab state:', jasmine.any(Error));
    expect(component.activeIndex).toBe(0);
  });

  it('should finalize tab switch correctly', () => {
    const targetIndex = 2;
    component.tabs[targetIndex].loading = true;
    
    component.finalizeTabSwitch(targetIndex);
    
    expect(component.activeIndex).toBe(targetIndex);
    expect(component.tabs[targetIndex].loading).toBe(false);
    expect(mockMessageService.add).toHaveBeenCalledWith({
      severity: 'info',
      summary: 'Tab Loaded',
      detail: `${component.tabs[targetIndex].label} content loaded successfully`
    });
  });
});