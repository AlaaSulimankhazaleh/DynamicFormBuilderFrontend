import { TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularFormLoaderService, FormLoaderConfig } from '../angular-form-loader.service';
import { ApplicationRef } from '@angular/core';

// Test component for dynamic loading
@Component({
  selector: 'app-test-form',
  template: `
    <div>
      <h3>Test Form</h3>
      <input [value]="testValue" (input)="updateValue($event)" />
      <button (click)="onSubmit()">Submit</button>
    </div>
  `
})
class TestFormComponent {
  @Input() testValue = '';
  @Output() formSubmit = new EventEmitter<string>();
  
  updateValue(event: any) {
    this.testValue = event.target.value;
  }
  
  onSubmit() {
    this.formSubmit.emit(this.testValue);
  }
}

describe('AngularFormLoaderService', () => {
  let service: AngularFormLoaderService;
  let applicationRef: ApplicationRef;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TestFormComponent],
      imports: [FormsModule],
      providers: [AngularFormLoaderService]
    });
    
    service = TestBed.inject(AngularFormLoaderService);
    applicationRef = TestBed.inject(ApplicationRef);
  });

  afterEach(async () => {
    // Clean up all forms after each test
    await service.cleanupAll();
    
    // Remove any test containers from DOM
    const containers = document.querySelectorAll('[data-form-loader="true"]');
    containers.forEach(container => container.remove());
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate unique container IDs', () => {
    const id1 = service.generateContainerId();
    const id2 = service.generateContainerId();
    const id3 = service.generateContainerId('custom-prefix');
    
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id3).toBeTruthy();
    expect(id1).not.toEqual(id2);
    expect(id3).toContain('custom-prefix');
  });

  it('should load a form successfully', async () => {
    const containerId = service.generateContainerId('test');
    const config: FormLoaderConfig = {
      containerId,
      componentType: TestFormComponent,
      inputs: { testValue: 'initial value' }
    };

    const result = await service.loadForm(config);
    
    expect(result).toBeTruthy();
    expect(result.componentRef).toBeTruthy();
    expect(result.containerId).toBe(containerId);
    expect(result.cleanup).toBeInstanceOf(Function);
    expect(service.isFormLoaded(containerId)).toBe(true);
    
    // Check if container was created in DOM
    const container = document.getElementById(containerId);
    expect(container).toBeTruthy();
    expect(container?.getAttribute('data-form-loader')).toBe('true');
  });

  it('should handle multiple forms simultaneously', async () => {
    const container1 = service.generateContainerId('form1');
    const container2 = service.generateContainerId('form2');
    
    const config1: FormLoaderConfig = {
      containerId: container1,
      componentType: TestFormComponent
    };
    
    const config2: FormLoaderConfig = {
      containerId: container2,
      componentType: TestFormComponent
    };

    const result1 = await service.loadForm(config1);
    const result2 = await service.loadForm(config2);
    
    expect(service.getLoadedForms()).toHaveSize(2);
    expect(service.getLoadedForms()).toContain(container1);
    expect(service.getLoadedForms()).toContain(container2);
    expect(result1.componentRef).not.toBe(result2.componentRef);
  });

  it('should clean up forms properly', async () => {
    const containerId = service.generateContainerId('cleanup-test');
    const config: FormLoaderConfig = {
      containerId,
      componentType: TestFormComponent
    };

    await service.loadForm(config);
    expect(service.isFormLoaded(containerId)).toBe(true);
    
    await service.cleanup(containerId);
    expect(service.isFormLoaded(containerId)).toBe(false);
    
    // Check if container was removed from DOM
    const container = document.getElementById(containerId);
    expect(container).toBeFalsy();
  });

  it('should handle NG05104-like errors gracefully', async () => {
    const invalidConfig: FormLoaderConfig = {
      containerId: '', // Invalid empty container ID
      componentType: TestFormComponent
    };

    let errorOccurred = false;
    let errorCode = '';
    
    // Subscribe to errors
    service.errors$.subscribe(error => {
      errorOccurred = true;
      errorCode = error.code;
    });

    try {
      await service.loadForm(invalidConfig);
      fail('Expected error to be thrown');
    } catch (error) {
      expect(errorOccurred).toBe(true);
      expect(errorCode).toBe('NG05104');
    }
  });

  it('should replace existing form in same container', async () => {
    const containerId = service.generateContainerId('replace-test');
    const config: FormLoaderConfig = {
      containerId,
      componentType: TestFormComponent
    };

    // Load first form
    const result1 = await service.loadForm(config);
    expect(service.getLoadedForms()).toHaveSize(1);
    
    // Load second form in same container
    const result2 = await service.loadForm(config);
    expect(service.getLoadedForms()).toHaveSize(1);
    expect(result1.componentRef).not.toBe(result2.componentRef);
  });

  it('should check application readiness', () => {
    const isReady = service.isApplicationReady();
    expect(typeof isReady).toBe('boolean');
  });

  it('should clean up all forms', async () => {
    const container1 = service.generateContainerId('cleanup-all-1');
    const container2 = service.generateContainerId('cleanup-all-2');
    
    await service.loadForm({ containerId: container1, componentType: TestFormComponent });
    await service.loadForm({ containerId: container2, componentType: TestFormComponent });
    
    expect(service.getLoadedForms()).toHaveSize(2);
    
    await service.cleanupAll();
    
    expect(service.getLoadedForms()).toHaveSize(0);
    expect(document.getElementById(container1)).toBeFalsy();
    expect(document.getElementById(container2)).toBeFalsy();
  });

  it('should handle component inputs and outputs', async () => {
    const containerId = service.generateContainerId('io-test');
    let submittedValue = '';
    
    const config: FormLoaderConfig = {
      containerId,
      componentType: TestFormComponent,
      inputs: { testValue: 'test input' },
      outputs: {
        formSubmit: (value: string) => { submittedValue = value; }
      }
    };

    const result = await service.loadForm(config);
    
    // Check if input was set
    expect(result.componentRef.instance.testValue).toBe('test input');
    
    // Simulate form submission
    result.componentRef.instance.testValue = 'submitted value';
    result.componentRef.instance.onSubmit();
    
    expect(submittedValue).toBe('submitted value');
  });

  it('should properly handle bootstrap errors', async () => {
    const containerId = service.generateContainerId('bootstrap-error-test');
    
    // Test the error handling method
    await service.handleBootstrapError(containerId, new Error('Test bootstrap error'));
    
    // Should not throw and should clean up properly
    expect(service.isFormLoaded(containerId)).toBe(false);
  });
});