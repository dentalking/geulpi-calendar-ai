import {
  KEYS,
  handleKeyboardNavigation,
  generateAriaId,
  announceToScreenReader,
  trapFocus,
} from '@/utils/accessibility';

describe('accessibility utils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('KEYS constant', () => {
    it('should contain all expected keyboard key values', () => {
      expect(KEYS.ENTER).toBe('Enter');
      expect(KEYS.SPACE).toBe(' ');
      expect(KEYS.ESCAPE).toBe('Escape');
      expect(KEYS.TAB).toBe('Tab');
      expect(KEYS.ARROW_UP).toBe('ArrowUp');
      expect(KEYS.ARROW_DOWN).toBe('ArrowDown');
      expect(KEYS.ARROW_LEFT).toBe('ArrowLeft');
      expect(KEYS.ARROW_RIGHT).toBe('ArrowRight');
      expect(KEYS.HOME).toBe('Home');
      expect(KEYS.END).toBe('End');
    });
  });

  describe('handleKeyboardNavigation', () => {
    it('should call the appropriate handler for the pressed key', () => {
      const enterHandler = jest.fn();
      const spaceHandler = jest.fn();
      const handlers = {
        [KEYS.ENTER]: enterHandler,
        [KEYS.SPACE]: spaceHandler,
      };

      const mockEvent = {
        key: 'Enter',
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyboardNavigation(mockEvent, handlers);

      expect(enterHandler).toHaveBeenCalledTimes(1);
      expect(spaceHandler).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should not call any handler for unregistered keys', () => {
      const enterHandler = jest.fn();
      const handlers = {
        [KEYS.ENTER]: enterHandler,
      };

      const mockEvent = {
        key: 'Escape',
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.KeyboardEvent;

      handleKeyboardNavigation(mockEvent, handlers);

      expect(enterHandler).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
    });
  });

  describe('generateAriaId', () => {
    it('should generate a unique ID with the given prefix', () => {
      const prefix = 'test';
      const id1 = generateAriaId(prefix);
      const id2 = generateAriaId(prefix);

      expect(id1).toContain(prefix);
      expect(id2).toContain(prefix);
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test-[a-z0-9]+$/);
    });
  });

  describe('announceToScreenReader', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create an announcement element with correct attributes', () => {
      const message = 'Test announcement';
      announceToScreenReader(message);

      const announcement = document.querySelector('[aria-live]');
      expect(announcement).toBeTruthy();
      expect(announcement?.getAttribute('aria-live')).toBe('polite');
      expect(announcement?.getAttribute('aria-atomic')).toBe('true');
      expect(announcement?.getAttribute('class')).toBe('sr-only');
      expect(announcement?.textContent).toBe(message);
    });

    it('should create announcement with assertive priority', () => {
      const message = 'Urgent announcement';
      announceToScreenReader(message, 'assertive');

      const announcement = document.querySelector('[aria-live="assertive"]');
      expect(announcement).toBeTruthy();
      expect(announcement?.textContent).toBe(message);
    });

    it('should remove announcement after timeout', () => {
      const message = 'Test announcement';
      announceToScreenReader(message);

      const announcement = document.querySelector('[aria-live]');
      expect(announcement).toBeTruthy();

      jest.advanceTimersByTime(1000);

      expect(document.querySelector('[aria-live]')).toBeFalsy();
    });
  });

  describe('trapFocus', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="modal">
          <button id="btn1">Button 1</button>
          <input id="input1" type="text" />
          <a id="link1" href="#">Link 1</a>
          <button id="btn2">Button 2</button>
        </div>
      `;
    });

    it('should focus the first focusable element', () => {
      const modal = document.getElementById('modal')!;
      const firstButton = document.getElementById('btn1')!;
      
      jest.spyOn(firstButton, 'focus');
      
      trapFocus(modal);

      expect(firstButton.focus).toHaveBeenCalled();
    });

    it('should handle Tab key to move focus to last element when on first', () => {
      const modal = document.getElementById('modal')!;
      const firstButton = document.getElementById('btn1')!;
      const lastButton = document.getElementById('btn2')!;

      Object.defineProperty(document, 'activeElement', {
        value: firstButton,
        writable: true,
      });

      jest.spyOn(lastButton, 'focus');

      trapFocus(modal);

      // Simulate Shift+Tab on first element
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      });

      jest.spyOn(tabEvent, 'preventDefault');
      modal.dispatchEvent(tabEvent);

      expect(tabEvent.preventDefault).toHaveBeenCalled();
      expect(lastButton.focus).toHaveBeenCalled();
    });

    it('should handle Tab key to move focus to first element when on last', () => {
      const modal = document.getElementById('modal')!;
      const firstButton = document.getElementById('btn1')!;
      const lastButton = document.getElementById('btn2')!;

      Object.defineProperty(document, 'activeElement', {
        value: lastButton,
        writable: true,
      });

      jest.spyOn(firstButton, 'focus');

      trapFocus(modal);

      // Simulate Tab on last element
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
      });

      jest.spyOn(tabEvent, 'preventDefault');
      modal.dispatchEvent(tabEvent);

      expect(tabEvent.preventDefault).toHaveBeenCalled();
      expect(firstButton.focus).toHaveBeenCalled();
    });

    it('should return cleanup function that removes event listener', () => {
      const modal = document.getElementById('modal')!;
      jest.spyOn(modal, 'removeEventListener');

      const cleanup = trapFocus(modal);
      cleanup();

      expect(modal.removeEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });
  });
});