import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DynamicFormComponent } from './components/dynamic-form/dynamic-form.component';
import { FormLoaderDemoComponent } from './components/form-loader-demo/form-loader-demo.component';
import { AngularFormLoaderService } from './services/angular-form-loader.service';

@NgModule({
  declarations: [
    AppComponent,
    DynamicFormComponent,
    FormLoaderDemoComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [
    AngularFormLoaderService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }