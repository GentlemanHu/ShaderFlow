from . import *


class SombreroMessage:

    # # Special

    class Any:
        """Any data type"""
        data: Any

    # # Mouse

    class Mouse:

        @define
        class Position:
            # Real
            x:  int = 0
            y:  int = 0
            dx: int = 0
            dy: int = 0

            # Normalized
            u:  float = 0.0
            v:  float = 0.0
            du: float = 0.0
            dv: float = 0.0

        @define
        class Press:
            button: int = 0

            # Real
            x: int = 0
            y: int = 0

            # Normalized
            u: float = 0.0
            v: float = 0.0

        @define
        class Release:
            button: int = 0

            # Real
            x: int = 0
            y: int = 0

            # Normalized
            u: float = 0.0
            v: float = 0.0

        @define
        class Drag:
            # Real
            x:  int = 0
            y:  int = 0
            dx: int = 0
            dy: int = 0

            # Normalized
            u:  float = 0.0
            v:  float = 0.0
            du: float = 0.0
            dv: float = 0.0

        @define
        class Scroll:
            # Real
            dx: int = 0
            dy: int = 0

            # Normalized
            du: float = 0.0
            dv: float = 0.0

    # # Window

    class Window:

        @define
        class Resize:
            width:  int = None
            height: int = None

        @define
        class Iconify:
            state: bool = None

        @define
        class FileDrop:
            files: list[str] = None

        @define
        class Close:
            ...

    # # Engine

    class Engine:

        @define
        class RecreateTextures:
            ...

        @define
        class ReloadShaders:
            ...

        @define
        class Render:
            ...

    # # Keyboard

    class Keyboard:

        @define
        class Press:
            key:       int = None
            action:    int = None
            modifiers: int = None

        @define
        class KeyDown:
            key:       int = None
            modifiers: int = None

        @define
        class KeyUp:
            key:       int = None
            modifiers: int = None

        @define
        class Unicode:
            char: str = None
