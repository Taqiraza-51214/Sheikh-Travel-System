import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  input,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { UiSelectOption } from '../types/ui.types';

@Component({
  selector: 'ui-select',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiSelectComponent),
      multi: true
    }
  ],
  template: `
    <label class="block">
      @if (label()) {
        <span class="mb-1.5 block text-[13px] font-semibold text-fleet-text">
          {{ label() }}
          @if (required()) { <span class="text-fleet-error">*</span> }
        </span>
      }

      <div class="relative">
        <button
          type="button"
          [disabled]="disabled()"
          class="flex w-full items-center justify-between gap-2 rounded-sm border bg-white px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:bg-fleet-surface-muted"
          [class.border-fleet-border]="!error()"
          [class.border-fleet-error]="!!error()"
          [class.border-fleet-primary]="open()"
          (click)="toggle()">
          <span class="truncate" [class.text-fleet-text-muted]="!hasSelection()">
            {{ displayLabel() }}
          </span>
          <mat-icon class="shrink-0 text-fleet-text-muted transition-transform" [class.rotate-180]="open()">expand_more</mat-icon>
        </button>

        @if (open()) {
          <div class="absolute z-30 mt-1 w-full overflow-hidden rounded-sm border border-fleet-border bg-white shadow-lg">
            @if (searchable()) {
              <div class="border-b border-fleet-border p-2">
                <input
                  type="search"
                  [placeholder]="searchPlaceholder()"
                  class="w-full rounded-sm border border-fleet-border px-2.5 py-1.5 text-sm focus:border-fleet-primary focus:outline-none"
                  [value]="query()"
                  (input)="onSearch($event)"
                  (click)="$event.stopPropagation()" />
              </div>
            }

            <ul class="max-h-60 overflow-y-auto py-1">
              @for (option of filteredOptions(); track option.value) {
                <li>
                  <button
                    type="button"
                    [disabled]="option.disabled"
                    class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-fleet-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
                    [class.text-fleet-primary]="isSelected(option.value)"
                    [class.font-semibold]="isSelected(option.value)"
                    (click)="selectOption(option)">
                    <span class="truncate">{{ option.label }}</span>
                    @if (isSelected(option.value)) { <mat-icon class="!text-[18px]">check</mat-icon> }
                  </button>
                </li>
              } @empty {
                <li class="px-3 py-4 text-center text-sm text-fleet-text-muted">No options found</li>
              }
            </ul>
          </div>
        }
      </div>

      @if (error()) {
        <span class="mt-1 block text-[12px] font-medium text-fleet-error">{{ error() }}</span>
      }
    </label>
  `,
  styles: [`
    :host { display: block; }
    mat-icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; font-size: 20px; }
  `]
})
export class UiSelectComponent implements ControlValueAccessor {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly label = input<string>();
  readonly options = input<UiSelectOption[]>([]);
  readonly placeholder = input('Select...');
  readonly searchPlaceholder = input('Search...');
  readonly multiple = input(false);
  readonly searchable = input(false);
  readonly required = input(false);
  readonly error = input<string>();

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly disabled = signal(false);
  protected readonly selected = signal<string[]>([]);

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly filteredOptions = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) {
      return this.options();
    }
    return this.options().filter((o) => o.label.toLowerCase().includes(q));
  });

  protected readonly hasSelection = computed(() => this.selected().length > 0);

  protected readonly displayLabel = computed(() => {
    const values = this.selected();
    if (!values.length) {
      return this.placeholder();
    }
    const labels = this.options()
      .filter((o) => values.includes(this.normalizeValue(o.value)))
      .map((o) => o.label);
    if (this.multiple()) {
      return labels.length > 2 ? `${labels.slice(0, 2).join(', ')} +${labels.length - 2}` : labels.join(', ');
    }
    return labels[0] ?? this.placeholder();
  });

  toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.open.update((v) => !v);
    if (!this.open()) {
      this.onTouched();
    }
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  isSelected(value: string | number | boolean): boolean {
    return this.selected().includes(this.normalizeValue(value));
  }

  selectOption(option: UiSelectOption): void {
    if (option.disabled) {
      return;
    }
    const normalized = this.normalizeValue(option.value);
    if (this.multiple()) {
      const next = this.isSelected(option.value)
        ? this.selected().filter((v) => v !== normalized)
        : [...this.selected(), normalized];
      this.selected.set(next);
      this.onChange(this.toOptionValues(next));
    } else {
      this.selected.set([normalized]);
      this.onChange(option.value);
      this.open.set(false);
      this.onTouched();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target)) {
      this.open.set(false);
      this.onTouched();
    }
  }

  writeValue(value: string | string[] | number | boolean | null | undefined): void {
    if (value == null || value === '') {
      this.selected.set([]);
      return;
    }
    if (Array.isArray(value)) {
      this.selected.set(value.map((v) => this.normalizeValue(v)).filter(Boolean));
      return;
    }
    const normalized = this.normalizeValue(value);
    this.selected.set(normalized ? [normalized] : []);
  }

  /** Coerce option/form values so numeric enums and string ids compare reliably. */
  private normalizeValue(value: unknown): string {
    if (value == null || value === '') {
      return '';
    }
    return String(value);
  }

  /** Map normalized internal values back to each option's declared value type. */
  private toOptionValues(normalizedValues: string[]): Array<string | number | boolean> {
    const options = this.options();
    return normalizedValues.map((value) => {
      const match = options.find((option) => this.normalizeValue(option.value) === value);
      return match?.value ?? value;
    });
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
