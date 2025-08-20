import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFormLoaderService, FormLoaderError } from '../../services/angular-form-loader.service';
import { DynamicFormComponent, DynamicFormConfig } from '../dynamic-form/dynamic-form.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-form-loader-demo',
  templateUrl: './form-loader-demo.component.html',
  styleUrls: ['./form-loader-demo.component.scss']
})
export class FormLoaderDemoComponent implements OnInit, OnDestroy {
  
  loadedForms: string[] = [];
  errors: FormLoaderError[] = [];
  isLoading = false;
  
  private errorSubscription?: Subscription;

  constructor(private formLoader: AngularFormLoaderService) {}

  ngOnInit() {
    // Subscribe to errors from the form loader
    this.errorSubscription = this.formLoader.errors$.subscribe(error => {
      this.errors.push(error);
      console.error('Form loader error:', error);
    });
  }

  ngOnDestroy() {
    // Clean up all loaded forms
    this.formLoader.cleanupAll();
    
    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe();
    }
  }

  async loadContactForm() {
    this.isLoading = true;
    
    try {
      const containerId = this.formLoader.generateContainerId('contact-form');
      
      const formConfig: DynamicFormConfig = {
        title: 'Contact Form',
        fields: [
          {
            name: 'name',
            type: 'text',
            label: 'Full Name',
            required: true
          },
          {
            name: 'email',
            type: 'email',
            label: 'Email Address',
            required: true
          },
          {
            name: 'subject',
            type: 'select',
            label: 'Subject',
            required: true,
            options: ['General Inquiry', 'Support', 'Sales', 'Feedback']
          },
          {
            name: 'message',
            type: 'textarea',
            label: 'Message',
            required: true
          }
        ],
        submitText: 'Send Message'
      };

      const result = await this.formLoader.loadForm({
        containerId,
        componentType: DynamicFormComponent,
        inputs: { config: formConfig },
        outputs: {
          formSubmit: (data: any) => this.onFormSubmit('Contact Form', data),
          formChange: (data: any) => this.onFormChange('Contact Form', data)
        }
      });

      this.loadedForms = this.formLoader.getLoadedForms();
      console.log('Contact form loaded successfully', result);
      
    } catch (error) {
      console.error('Failed to load contact form:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadRegistrationForm() {
    this.isLoading = true;
    
    try {
      const containerId = this.formLoader.generateContainerId('registration-form');
      
      const formConfig: DynamicFormConfig = {
        title: 'User Registration',
        fields: [
          {
            name: 'username',
            type: 'text',
            label: 'Username',
            required: true
          },
          {
            name: 'email',
            type: 'email',
            label: 'Email',
            required: true
          },
          {
            name: 'age',
            type: 'number',
            label: 'Age',
            required: false
          },
          {
            name: 'country',
            type: 'select',
            label: 'Country',
            required: true,
            options: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France']
          },
          {
            name: 'bio',
            type: 'textarea',
            label: 'Bio',
            required: false
          }
        ],
        submitText: 'Register'
      };

      const result = await this.formLoader.loadForm({
        containerId,
        componentType: DynamicFormComponent,
        inputs: { config: formConfig },
        outputs: {
          formSubmit: (data: any) => this.onFormSubmit('Registration Form', data),
          formChange: (data: any) => this.onFormChange('Registration Form', data)
        }
      });

      this.loadedForms = this.formLoader.getLoadedForms();
      console.log('Registration form loaded successfully', result);
      
    } catch (error) {
      console.error('Failed to load registration form:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadFormWithError() {
    this.isLoading = true;
    
    try {
      // Simulate a form that might cause NG05104-like error by using invalid container ID
      const invalidContainerId = '';
      
      await this.formLoader.loadForm({
        containerId: invalidContainerId,
        componentType: DynamicFormComponent,
        inputs: { config: { fields: [] } }
      });
      
    } catch (error) {
      console.log('Expected error occurred:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async cleanupForm(containerId: string) {
    try {
      await this.formLoader.cleanup(containerId);
      this.loadedForms = this.formLoader.getLoadedForms();
      console.log(`Cleaned up form: ${containerId}`);
    } catch (error) {
      console.error('Failed to cleanup form:', error);
    }
  }

  async cleanupAllForms() {
    try {
      await this.formLoader.cleanupAll();
      this.loadedForms = [];
      console.log('All forms cleaned up');
    } catch (error) {
      console.error('Failed to cleanup all forms:', error);
    }
  }

  clearErrors() {
    this.errors = [];
  }

  private onFormSubmit(formName: string, data: any) {
    console.log(`${formName} submitted:`, data);
    alert(`${formName} submitted successfully! Check console for data.`);
  }

  private onFormChange(formName: string, data: any) {
    console.log(`${formName} changed:`, data);
  }
}