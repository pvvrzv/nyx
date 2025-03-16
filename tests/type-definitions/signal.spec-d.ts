import { signal } from "@lib";

test("signal hook type test", () => {
  expectTypeOf(signal).toBeCallableWith("");
  expectTypeOf(signal).toBeCallableWith(2);
  expectTypeOf(signal).toBeCallableWith(new Map());
  expectTypeOf(signal).toBeCallableWith({});

  const s = signal(1);

  expectTypeOf(s.set).toBeCallableWith(2);
  expectTypeOf(s.update).toBeCallableWith(() => 2);
  expectTypeOf(s.update).parameter(0).parameter(0).toEqualTypeOf<number>();

  expectTypeOf(s.get()).toBeNumber();
  expectTypeOf(s.set(1)).toBeNumber();
  expectTypeOf(s.update(() => 3)).toBeNumber();

  const foo = signal<HTMLElement>();

  expectTypeOf(foo.get()).toEqualTypeOf<HTMLElement | undefined>();
  expectTypeOf(foo.set).toBeCallableWith(undefined);
  expectTypeOf(foo.set).toBeCallableWith(document.createElement("div"));
  expectTypeOf(foo.update)
    .parameter(0)
    .parameter(0)
    .toEqualTypeOf<HTMLElement | undefined>();
});
