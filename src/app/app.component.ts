import { Component } from '@angular/core';
import { GatewayService } from './gateway.service';
import { HttpClient } from '@angular/common/http';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'angular';
  gateway: GatewayService;

  constructor(http: HttpClient, gateway: GatewayService) {
    this.gateway = gateway;
  }
}
