import { Component } from '@angular/core';

export interface TableElement {
  nth: number;
  num: number;
}
const ELEMENT_DATA: TableElement[] = [
  {nth: 0, num: 0},
  {nth: 1, num: 1},
  {nth: 2, num: 2},
  {nth: 3, num: 3},
  {nth: 4, num: 4},
  {nth: 5, num: 5},
  {nth: 6, num: 6},
];

@Component({
  selector: 'app-example4',
  templateUrl: './example4.component.html',
  styleUrls: ['./example4.component.scss']
})
export class Example4Component {
  constructor() {}

  displayedColumns: string[] = ['nth', 'num'];
  dataSource = ELEMENT_DATA;
}
