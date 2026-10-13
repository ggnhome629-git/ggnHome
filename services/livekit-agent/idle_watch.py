"""Decides when a quiet voice session should warn and then end.

A free LiveKit plan has a small number of concurrent agent sessions and a
monthly minutes allowance, so a visitor who walks away must not hold a slot.
Pure logic with an injectable clock so it can be tested without waiting.
"""
import time
from typing import Callable, Literal

Action = Literal["none", "warn", "end"]


class IdleWatch:
    def __init__(self, warn_after_s: float, end_after_s: float, clock: Callable[[], float] = time.monotonic) -> None:
        self.warn_after_s = max(5.0, warn_after_s)
        self.end_after_s = max(self.warn_after_s + 5.0, end_after_s)
        self._clock = clock
        self._last = clock()
        self._warned = False
        self._busy = 0

    def touch(self) -> None:
        """Any sign of life: the visitor spoke or typed, or a reply was sent."""
        self._last = self._clock()
        self._warned = False

    def busy(self, active: bool) -> None:
        """While the assistant itself is speaking, the session is not idle."""
        self._busy = max(0, self._busy + (1 if active else -1))
        if not active:
            self.touch()

    def check(self) -> Action:
        if self._busy:
            return "none"
        quiet = self._clock() - self._last
        if quiet >= self.end_after_s:
            return "end"
        if quiet >= self.warn_after_s and not self._warned:
            self._warned = True
            return "warn"
        return "none"
