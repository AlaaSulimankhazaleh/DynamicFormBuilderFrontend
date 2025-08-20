import { Injectable, ComponentRef, ApplicationRef, Injector, Type, ViewContainerRef, ComponentFactoryResolver, EmbeddedViewRef } from '@angular/core';
import { Subject } from 'rxjs';

export interface FormLoaderConfig {
  containerId: string;
  componentType: Type<any>;
  inputs?: { [key: string]: any };
  outputs?: { [key: string]: (event: any) => void };
}

export interface FormLoaderResult {
  componentRef: ComponentRef<any>;
  containerId: string;
  cleanup: () => void;
}

export interface FormLoaderError {
  code: string;
  message: string;
  containerId: string;
  originalError?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AngularFormLoaderService {
  private loadedForms = new Map<string, FormLoaderResult>();
  private containerCounter = 0;
  private applicationRef: ApplicationRef;
  private injector: Injector;
  
  // Error handling
  private errorSubject = new Subject<FormLoaderError>();
  public errors$ = this.errorSubject.asObservable();

  constructor(applicationRef: ApplicationRef, injector: Injector) {
    this.applicationRef = applicationRef;
    this.injector = injector;
  }

  /**
   * Loads an Angular component dynamically into a specified container
   * Handles NG05104 error by using proper dynamic component loading instead of multiple bootstrap
   */
  async loadForm(config: FormLoaderConfig): Promise<FormLoaderResult> {
    try {
      // Clean up any existing form in the same container
      if (this.loadedForms.has(config.containerId)) {
        await this.cleanup(config.containerId);
      }

      // Ensure container exists with proper timing and error handling
      const containerElement = await this.ensureContainer(config.containerId);
      
      // Create component dynamically using Angular's component factory
      const componentRef = await this.createDynamicComponent(config, containerElement);
      
      // Create cleanup function
      const cleanup = () => this.cleanup(config.containerId);
      
      const result: FormLoaderResult = {
        componentRef,
        containerId: config.containerId,
        cleanup
      };
      
      // Store for cleanup management
      this.loadedForms.set(config.containerId, result);
      
      console.log(`AngularFormLoader: Successfully loaded form in container ${config.containerId}`);
      return result;
      
    } catch (error: any) {
      const formError: FormLoaderError = {
        code: this.getErrorCode(error),
        message: `Failed to load form in container ${config.containerId}: ${error?.message || 'Unknown error'}`,
        containerId: config.containerId,
        originalError: error
      };
      
      this.errorSubject.next(formError);
      console.error('AngularFormLoader: Failed to load form', formError);
      throw new Error(formError.message);
    }
  }

  /**
   * Creates or ensures the container element exists with proper timing
   * This addresses NG05104 by ensuring the root element is available before component creation
   */
  private async ensureContainer(containerId: string): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      try {
        // Check if container already exists
        let container = document.getElementById(containerId);
        
        if (!container) {
          // Create new container element with proper attributes
          container = document.createElement('div');
          container.id = containerId;
          container.classList.add('angular-form-container');
          
          // Add data attributes for easier debugging
          container.setAttribute('data-form-loader', 'true');
          container.setAttribute('data-created-at', new Date().toISOString());
          
          // Find a parent element to append to (body by default)
          const parentElement = document.body;
          parentElement.appendChild(container);
        }
        
        // Use requestAnimationFrame to ensure DOM is ready
        // This prevents NG05104 by ensuring proper timing
        requestAnimationFrame(() => {
          const verifyContainer = document.getElementById(containerId);
          if (verifyContainer) {
            resolve(verifyContainer);
          } else {
            reject(new Error(`NG05104_LIKE: Container ${containerId} not found after creation`));
          }
        });
        
      } catch (error: any) {
        reject(new Error(`Failed to create container ${containerId}: ${error?.message || 'Unknown error'}`));
      }
    });
  }

  /**
   * Create dynamic component using Angular's ComponentFactoryResolver
   * This approach avoids NG05104 by not requiring multiple bootstrap instances
   */
  private async createDynamicComponent(config: FormLoaderConfig, containerElement: HTMLElement): Promise<ComponentRef<any>> {
    try {
      // Get component factory - this is the Angular way to avoid NG05104
      const componentFactoryResolver = this.injector.get(ComponentFactoryResolver);
      const componentFactory = componentFactoryResolver.resolveComponentFactory(config.componentType);
      
      // Create component instance
      const componentRef = componentFactory.create(this.injector);
      
      // Set inputs if provided
      if (config.inputs) {
        Object.keys(config.inputs).forEach(key => {
          if (componentRef.instance.hasOwnProperty(key)) {
            componentRef.instance[key] = config.inputs![key];
          }
        });
      }
      
      // Set up outputs if provided
      if (config.outputs) {
        Object.keys(config.outputs).forEach(key => {
          if (componentRef.instance[key] && componentRef.instance[key].subscribe) {
            componentRef.instance[key].subscribe(config.outputs![key]);
          }
        });
      }
      
      // Attach component to the Angular application
      this.applicationRef.attachView(componentRef.hostView);
      
      // Get the DOM element and append to container
      const domElement = (componentRef.hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;
      containerElement.appendChild(domElement);
      
      // Trigger change detection
      componentRef.changeDetectorRef.detectChanges();
      
      return componentRef;
      
    } catch (error: any) {
      throw new Error(`Failed to create dynamic component: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Clean up a loaded form and remove it from the DOM
   */
  async cleanup(containerId: string): Promise<void> {
    const formResult = this.loadedForms.get(containerId);
    
    if (formResult) {
      try {
        // Detach and destroy the component
        if (formResult.componentRef) {
          this.applicationRef.detachView(formResult.componentRef.hostView);
          formResult.componentRef.destroy();
        }
        
        // Remove the container element
        const container = document.getElementById(containerId);
        if (container) {
          container.remove();
        }
        
        // Remove from tracking
        this.loadedForms.delete(containerId);
        
        console.log(`AngularFormLoader: Cleaned up form in container ${containerId}`);
        
      } catch (error) {
        console.error(`AngularFormLoader: Error during cleanup of ${containerId}`, error);
        
        // Still remove from tracking even if cleanup failed
        this.loadedForms.delete(containerId);
      }
    }
  }

  /**
   * Clean up all loaded forms
   */
  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.loadedForms.keys()).map(containerId => 
      this.cleanup(containerId)
    );
    
    await Promise.all(cleanupPromises);
    console.log('AngularFormLoader: All forms cleaned up');
  }

  /**
   * Generate a unique container ID that's safe for DOM
   */
  generateContainerId(prefix = 'form-container'): string {
    return `${prefix}-${++this.containerCounter}-${Date.now()}`;
  }

  /**
   * Get list of currently loaded forms
   */
  getLoadedForms(): string[] {
    return Array.from(this.loadedForms.keys());
  }

  /**
   * Get a specific loaded form result
   */
  getLoadedForm(containerId: string): FormLoaderResult | undefined {
    return this.loadedForms.get(containerId);
  }

  /**
   * Check if a form is loaded in a specific container
   */
  isFormLoaded(containerId: string): boolean {
    return this.loadedForms.has(containerId);
  }

  /**
   * Extract error code from error object
   */
  private getErrorCode(error: any): string {
    if (error.code) {
      return error.code;
    }
    
    if (error.message) {
      if (error.message.includes('NG05104')) {
        return 'NG05104';
      }
      if (error.message.includes('NG05104_LIKE')) {
        return 'NG05104_LIKE';
      }
      if (error.message.includes('Container') && error.message.includes('not found')) {
        return 'CONTAINER_NOT_FOUND';
      }
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Utility method to check if the application is ready for component loading
   */
  isApplicationReady(): boolean {
    return this.applicationRef && this.applicationRef.components.length > 0;
  }

  /**
   * Method to handle and recover from NG05104-like errors
   */
  async handleBootstrapError(containerId: string, error: any): Promise<void> {
    console.warn(`AngularFormLoader: Handling bootstrap error for ${containerId}`, error);
    
    // Clean up any partial state
    await this.cleanup(containerId);
    
    // Wait a bit for DOM to stabilize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // The container will be recreated on the next loadForm call
  }
}