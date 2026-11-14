/**
 * An `EventTarget` whose events are `CustomEvent`s typed by `EventMap`
 * (event name → type of `detail`).
 */
interface TypedEventTarget<EventMap extends object> {
  addEventListener<K extends keyof EventMap & string>(
    type: K,
    listener: (event: CustomEvent<EventMap[K]>) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof EventMap & string>(
    type: K,
    listener: (event: CustomEvent<EventMap[K]>) => void,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void;
}

class TypedEventTarget<EventMap extends object> extends EventTarget {
  emit<K extends keyof EventMap & string>(
    type: K,
    ...[detail]: EventMap[K] extends void ? [] : [EventMap[K]]
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

export default TypedEventTarget;
