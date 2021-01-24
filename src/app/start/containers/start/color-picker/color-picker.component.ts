import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColorPickerComponent implements OnInit {


  @Input() colors: string[];
  @Input()
  color: string;
  @Output() colorChange = new EventEmitter<string>();

  constructor() {
  }

  ngOnInit(): void {
  }

  onPickColor(pColor: string) {
    this.colorChange.emit(pColor);
  }
}
