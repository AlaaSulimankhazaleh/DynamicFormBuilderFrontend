import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface FormField {
  name: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select';
  label: string;
  required?: boolean;
  options?: string[];
  validators?: any[];
}

export interface DynamicFormConfig {
  title?: string;
  fields: FormField[];
  submitText?: string;
}

@Component({
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['./dynamic-form.component.scss']
})
export class DynamicFormComponent implements OnInit {
  @Input() config: DynamicFormConfig = { fields: [] };
  @Input() initialData: any = {};
  
  @Output() formSubmit = new EventEmitter<any>();
  @Output() formChange = new EventEmitter<any>();
  @Output() formValid = new EventEmitter<boolean>();

  dynamicForm: FormGroup;
  
  constructor(private fb: FormBuilder) {
    this.dynamicForm = this.fb.group({});
  }

  ngOnInit() {
    this.buildForm();
  }

  private buildForm() {
    const formControls: any = {};
    
    this.config.fields.forEach(field => {
      const validators = [];
      
      if (field.required) {
        validators.push(Validators.required);
      }
      
      if (field.type === 'email') {
        validators.push(Validators.email);
      }
      
      // Add custom validators if provided
      if (field.validators) {
        validators.push(...field.validators);
      }
      
      const initialValue = this.initialData[field.name] || '';
      formControls[field.name] = [initialValue, validators];
    });
    
    this.dynamicForm = this.fb.group(formControls);
    
    // Subscribe to form changes
    this.dynamicForm.valueChanges.subscribe(value => {
      this.formChange.emit(value);
    });
    
    // Subscribe to form validity changes
    this.dynamicForm.statusChanges.subscribe(status => {
      this.formValid.emit(status === 'VALID');
    });
  }

  onSubmit() {
    if (this.dynamicForm.valid) {
      this.formSubmit.emit(this.dynamicForm.value);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.dynamicForm.controls).forEach(key => {
        this.dynamicForm.get(key)?.markAsTouched();
      });
    }
  }

  getFieldError(fieldName: string): string | null {
    const field = this.dynamicForm.get(fieldName);
    if (field && field.invalid && field.touched) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['email']) {
        return 'Please enter a valid email address';
      }
    }
    return null;
  }

  getFieldLabel(fieldName: string): string {
    const field = this.config.fields.find(f => f.name === fieldName);
    return field ? field.label : fieldName;
  }

  reset() {
    this.dynamicForm.reset();
    this.buildForm();
  }
}