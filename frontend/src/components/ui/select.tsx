"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
  type SelectHTMLAttributes,
} from "react";
import { FiChevronDown } from "react-icons/fi";
import { cn } from "@/lib/cn";

const DROPDOWN_GAP = 4;
const DROPDOWN_MAX_HEIGHT = 320; // matches max-h-80
const DROPDOWN_MIN_HEIGHT = 96;
const VIEWPORT_EDGE = 8;

type DropdownPosition = {
  placement: "down" | "up";
  maxHeight: number;
};

type OptionProps = {
  value?: string | number;
  disabled?: boolean;
  children?: ReactNode;
};

type OptionItem = {
  value: string;
  label: ReactNode;
  disabled: boolean;
};

function getOptions(children: ReactNode): OptionItem[] {
  return Children.toArray(children)
    .filter(
      (child): child is ReactElement<OptionProps> =>
        isValidElement(child) && child.type === "option",
    )
    .map((child) => ({
      value: String(child.props.value ?? ""),
      label: child.props.children,
      disabled: Boolean(child.props.disabled),
    }));
}

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { containerClassName?: string }
>(function Select(
  {
    className,
    containerClassName,
    children,
    value,
    defaultValue,
    disabled,
    onChange,
    id,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;

  const selectRef = useRef<HTMLSelectElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => selectRef.current!);

  const options = getOptions(children);

  const getInitialValue = () => String(value ?? defaultValue ?? "");

  const [internalValue, setInternalValue] = useState(getInitialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<DropdownPosition>({
    placement: "down",
    maxHeight: DROPDOWN_MAX_HEIGHT,
  });

  const selectedValue = value !== undefined ? String(value) : internalValue;

  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );

  const selectedIndex = options.findIndex(
    (option) => option.value === selectedValue,
  );

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(String(value));
    }
  }, [value]);

  const placeDropdown = useCallback(() => {
    const container = containerRef.current;
    const dropdown = dropdownRef.current;

    if (!container || !dropdown) return;

    const rect = container.getBoundingClientRect();
    const height = dropdown.offsetHeight;
    const spaceBelow =
      window.innerHeight - rect.bottom - DROPDOWN_GAP - VIEWPORT_EDGE;
    const spaceAbove = rect.top - DROPDOWN_GAP - VIEWPORT_EDGE;

    // open upward only when it does not fit below and there is more room above
    const openUp = height > spaceBelow && spaceAbove > spaceBelow;
    const available = Math.max(
      openUp ? spaceAbove : spaceBelow,
      DROPDOWN_MIN_HEIGHT,
    );
    const maxHeight = Math.min(DROPDOWN_MAX_HEIGHT, available);
    const placement = openUp ? "up" : "down";

    setPosition((previous) =>
      previous.placement === placement && previous.maxHeight === maxHeight
        ? previous
        : { placement, maxHeight },
    );
  }, []);

  useLayoutEffect(() => {
    if (isOpen) placeDropdown();
  }, [isOpen, options.length, placeDropdown]);

  useEffect(() => {
    if (!isOpen) return;

    const handleViewportChange = () => placeDropdown();

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, placeDropdown]);

  useEffect(() => {
    function handleOutsideClick(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, []);

  function openDropdown() {
    if (disabled) return;

    const firstEnabled = options.findIndex((option) => !option.disabled);

    setActiveIndex(
      selectedIndex >= 0 && !options[selectedIndex]?.disabled
        ? selectedIndex
        : Math.max(firstEnabled, 0),
    );

    setIsOpen(true);
  }

  function selectOption(nextValue: string) {
    const select = selectRef.current;

    if (!select) return;

    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value",
    )?.set;

    nativeSetter?.call(select, nextValue);

    setInternalValue(nextValue);
    setIsOpen(false);

    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const enabledOptions = options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !option.disabled);

    if (!enabledOptions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isOpen) {
        openDropdown();
        return;
      }

      const currentPosition = enabledOptions.findIndex(
        ({ index }) => index === activeIndex,
      );

      const nextPosition = (currentPosition + 1) % enabledOptions.length;

      setActiveIndex(enabledOptions[nextPosition].index);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!isOpen) {
        openDropdown();
        return;
      }

      const currentPosition = enabledOptions.findIndex(
        ({ index }) => index === activeIndex,
      );

      const nextPosition =
        (currentPosition - 1 + enabledOptions.length) % enabledOptions.length;

      setActiveIndex(enabledOptions[nextPosition].index);
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (!isOpen) {
        openDropdown();
      } else {
        const option = options[activeIndex];

        if (option && !option.disabled) {
          selectOption(option.value);
        }
      }
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }

    if (event.key === "Home" && isOpen) {
      event.preventDefault();
      setActiveIndex(enabledOptions[0].index);
    }

    if (event.key === "End" && isOpen) {
      event.preventDefault();
      setActiveIndex(enabledOptions[enabledOptions.length - 1].index);
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block w-full", containerClassName)}
    >
      <select
        ref={selectRef}
        id={id}
        value={selectedValue}
        disabled={disabled}
        onChange={onChange}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
        {...props}
      >
        {children}
      </select>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={props["aria-label"]}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            openDropdown();
          }
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-md border border-border-strong bg-surface pl-3.5 pr-3.5 text-left text-sm text-text transition-colors focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        <span className="truncate">{selectedOption?.label}</span>

        <FiChevronDown
          className={cn(
            "size-4 shrink-0 text-text-muted transition-transform",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          aria-label={props["aria-label"] ?? "Options"}
          style={{ maxHeight: position.maxHeight }}
          className={cn(
            "absolute right-0 z-50 w-max min-w-full overflow-y-auto rounded-md border border-border-strong bg-surface py-1 shadow-lg scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            position.placement === "up" ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {options.map((option, index) => {
            const isSelected = option.value === selectedValue;
            const isActive = index === activeIndex;

            return (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option.value)}
                className={cn(
                  "flex w-full items-center px-3.5 py-2.5 text-left text-sm transition-colors",
                  isSelected
                    ? "bg-surface-muted text-text font-medium"
                    : "text-text",
                  isActive && "bg-surface-muted",
                  option.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
