
/* auto */ import { O, assertTrue } from '../../ui512/utils/utilsAssert.js';
/* auto */ import { RenderComplete, Util512, assertEqWarn, cast, fitIntoInclusive, getRoot } from '../../ui512/utils/utilsUI512.js';
/* auto */ import { ScrollConsts } from '../../ui512/utils/utilsDrawConstants.js';
/* auto */ import { CanvasWrapper, RectUtils } from '../../ui512/utils/utilsDraw.js';
/* auto */ import { CharRectType, FoundCharByLocation, largeArea } from '../../ui512/draw/ui512DrawTextClasses.js';
/* auto */ import { FormattedText } from '../../ui512/draw/ui512FormattedText.js';
/* auto */ import { RenderTextArgs, renderTextArgsFromEl } from '../../ui512/draw/ui512DrawTextParams.js';
/* auto */ import { UI512DrawText } from '../../ui512/draw/ui512DrawText.js';
/* auto */ import { UI512ViewDrawBorders } from '../../ui512/draw/ui512DrawBorders.js';
/* auto */ import { UI512Element } from '../../ui512/elements/ui512ElementsBase.js';
/* auto */ import { UI512ElGroup } from '../../ui512/elements/ui512ElementsGroup.js';
/* auto */ import { UI512Application } from '../../ui512/elements/ui512ElementsApp.js';
/* auto */ import { UI512ElButton } from '../../ui512/elements/ui512ElementsButton.js';
/* auto */ import { UI512ElTextField } from '../../ui512/elements/ui512ElementsTextField.js';
/* auto */ import { UI512ViewDraw } from '../../ui512/elements/ui512ElementsView.js';
/* auto */ import { UI512PresenterWithMenuInterface } from '../../ui512/menu/ui512PresenterWithMenu.js';
/* auto */ import { GenericTextField, UI512ElTextFieldAsGeneric } from '../../ui512/textedit/ui512GenericField.js';

export class ScrollbarImpl {
    /**
     * if calling set(), you should always use a GenericTextField and not the UI512Element
     */
    protected gelFromEl(el: O<UI512Element>): O<GenericTextField> {
        return el && el instanceof UI512ElTextField ?
            new UI512ElTextFieldAsGeneric(el) :
            undefined;
    }

    /**
     * construct elements for scrollbar
     */
    buildScrollbar(app: UI512Application, grp: UI512ElGroup, el: UI512ElTextField) {
        let arrowUp = new UI512ElButton(fldIdToScrollbarPartId(el.id, 'arrowUp'), el.observer);
        arrowUp.set('visible', false);
        arrowUp.set('icongroupid', '001');
        arrowUp.set('iconnumber', 23);

        let arrowDn = new UI512ElButton(fldIdToScrollbarPartId(el.id, 'arrowDn'), el.observer);
        arrowDn.set('visible', false);
        arrowDn.set('icongroupid', '001');
        arrowDn.set('iconnumber', 24);

        let scrollBgUp = new UI512ElButton(fldIdToScrollbarPartId(el.id, 'scrollBgUp'), el.observer);
        scrollBgUp.set('visible', false);
        scrollBgUp.set('autohighlight', false);

        let scrollBgDn = new UI512ElButton(fldIdToScrollbarPartId(el.id, 'scrollBgDn'), el.observer);
        scrollBgDn.set('visible', false);
        scrollBgDn.set('autohighlight', false);

        let scrollThm = new UI512ElButton(fldIdToScrollbarPartId(el.id, 'scrollThm'), el.observer);
        scrollThm.set('visible', false);
        scrollThm.set('autohighlight', false);

        let elParts = [scrollBgUp, scrollBgDn, arrowUp, arrowDn, scrollThm];
        for (let elPart of elParts) {
            if (!grp.findEl(elPart.id)) {
                grp.addElementAfter(app, elPart, el.id);
            }
        }
    }

    /**
     * remove elements for scrollbar
     */
    removeScrollbar(app: UI512Application, grp: UI512ElGroup, el: UI512ElTextField) {
        grp.removeElement(fldIdToScrollbarPartId(el.id, 'arrowUp'));
        grp.removeElement(fldIdToScrollbarPartId(el.id, 'arrowDn'));
        grp.removeElement(fldIdToScrollbarPartId(el.id, 'scrollBgUp'));
        grp.removeElement(fldIdToScrollbarPartId(el.id, 'scrollBgDn'));
        grp.removeElement(fldIdToScrollbarPartId(el.id, 'scrollThm'));
    }

    /**
     * position scrollbar elements.
     * if the font has not yet loaded, returns early and doesn't set the RenderComplete flag.
     */
    setPositions(
        app: UI512Application,
        grp: UI512ElGroup,
        el: UI512ElTextField,
        complete: RenderComplete
    ) {
        if (!el) {
            return;
        }

        assertEqWarn(
            el.get_b('scrollbar'),
            !!grp.findEl(fldIdToScrollbarPartId(el.id, 'arrowUp')),
            'forgot to call rebuildFieldScrollbars? ' + el.id
        );

        if (!el || !el.visible || !el.getdirty() || !el.get_b('scrollbar')) {
            return;
        }

        let pieces = this.getScrollbarPieces(app, el);
        if (this.isThereSpaceToShowScrollbar(el, pieces)) {
            for (let piece of Util512.getMapVals(pieces)) {
                piece.set('visible', true);
            }

            /* set positions */
            this.setPositionsImpl(el, pieces, complete);
        } else {
            /* hide everything if field dimensions are too small to show a scrollbar */
            for (let piece of Util512.getMapVals(pieces)) {
                piece.set('visible', false);
            }
        }
    }

    /**
     * set positions
     */
    protected setPositionsImpl(
        el: UI512ElTextField,
        pieces: { [key: string]: UI512Element },
        complete: RenderComplete
    ) {
        let scrollRatio = this.repositionScrollbarGetThumbPos(el);
        if (scrollRatio === undefined) {
            /* font is not yet loaded */
            complete.complete = false;
        }

        /* set position of arrow up and down */
        let sbX = el.right - ScrollConsts.BarWidth;
        pieces.arrowUp.setDimensions(sbX, el.y, ScrollConsts.BoxHeight, ScrollConsts.BoxHeight);
        pieces.arrowDn.setDimensions(
            sbX,
            el.bottom - ScrollConsts.BoxHeight,
            ScrollConsts.BoxHeight,
            ScrollConsts.BoxHeight
        );

        if (scrollRatio === -1 || scrollRatio === undefined) {
            /* content is short, so */
            /* make the scrollbar look "disabled" and hide the thumb */
            pieces.scrollThm.setDimensions(0, 0, 0, 0);
            pieces.scrollBgDn.setDimensions(0, 0, 0, 0);
            pieces.scrollBgUp.setDimensions(pieces.arrowUp.x, pieces.arrowUp.y, ScrollConsts.BarWidth, el.h);
            pieces.scrollBgUp.set('icongroupid', '');
            pieces.scrollBgUp.set('iconnumber', 0);
            pieces.scrollBgDn.set('icongroupid', '');
            pieces.scrollBgDn.set('iconnumber', 0);
            pieces.arrowUp.set('autohighlight', false);
            pieces.arrowUp.set('iconnumberwhenhighlight', -1);
            pieces.arrowDn.set('autohighlight', false);
            pieces.arrowDn.set('iconnumberwhenhighlight', -1);
        } else {
            /* content is long enough, so enable the scrollbar */
            let spaceBetween = pieces.arrowDn.y - pieces.arrowUp.bottom - ScrollConsts.BoxHeight;
            let thumbPos = Math.floor(scrollRatio * spaceBetween) + pieces.arrowUp.bottom;
            let midpoint = thumbPos + Math.floor(ScrollConsts.BoxHeight / 2);

            /* make it an even number */
            midpoint = midpoint + midpoint % 2;
            pieces.scrollBgUp.setDimensions(sbX, el.y, ScrollConsts.BarWidth, midpoint - el.y);
            pieces.scrollBgDn.setDimensions(sbX, midpoint, ScrollConsts.BarWidth, el.bottom - midpoint);
            pieces.scrollThm.setDimensions(sbX + 1, thumbPos, ScrollConsts.BoxHeight - 2, ScrollConsts.BoxHeight);

            /* set icons and properties */
            pieces.scrollBgUp.set('icongroupid', '001');
            pieces.scrollBgUp.set('iconnumber', 144);
            pieces.scrollBgUp.set('iconadjustsrcx', 2);
            pieces.scrollBgUp.set('iconcentered', false);
            pieces.scrollBgDn.set('icongroupid', '001');
            pieces.scrollBgDn.set('iconnumber', 144);
            pieces.scrollBgDn.set('iconadjustsrcx', 2);
            pieces.scrollBgDn.set('iconcentered', false);
            pieces.arrowUp.set('autohighlight', true);
            pieces.arrowUp.set('iconnumberwhenhighlight', 25);
            pieces.arrowDn.set('autohighlight', true);
            pieces.arrowDn.set('iconnumberwhenhighlight', 26);
        }
    }

    /**
     * just a convenient way to call getElemById on all the pieces
     */
    protected getScrollbarPieces(app: UI512Application, el: UI512Element): { [key: string]: UI512Element } {
        return {
            arrowUp: app.getElemById(fldIdToScrollbarPartId(el.id, 'arrowUp')),
            arrowDn: app.getElemById(fldIdToScrollbarPartId(el.id, 'arrowDn')),
            scrollBgUp: app.getElemById(fldIdToScrollbarPartId(el.id, 'scrollBgUp')),
            scrollBgDn: app.getElemById(fldIdToScrollbarPartId(el.id, 'scrollBgDn')),
            scrollThm: app.getElemById(fldIdToScrollbarPartId(el.id, 'scrollThm')),
        };
    }

    /**
     * remove both the text field and its scrollbar parts
     */
    removeScrollbarField(app: UI512Application, grp: UI512ElGroup, el: UI512Element) {
        if (el instanceof UI512ElTextField) {
            el.set('scrollbar', false);
            this.removeScrollbar(app, grp, el);
            grp.removeElement(el.id);
        }
    }

    /**
     * if there isn't enough space to show the full scrollbar
     * we currently just hide everything. doesn't match original, but simpler.
     */
    isThereSpaceToShowScrollbar(el: UI512Element, pieces: any) {
        return el.w > ScrollConsts.BarWidth + 1 && el.h > 3 * ScrollConsts.BoxHeight + 1;
    }

    /**
     * draw characters in a field -- either to really draw the text,
     * or to find the eventual position-on-screen of a character.
     */
    protected simulateDrawField(
        el: UI512ElTextField,
        measureHeight: boolean,
        drawBeyondVisible: boolean,
        callbackPerChar: O<(charindex: number, type: CharRectType, bounds: number[]) => boolean>
    ) {
        let b = new UI512ViewDrawBorders(
            new CanvasWrapper(undefined),
            el.x,
            el.y,
            el.w,
            el.h,
            new RenderComplete()
        );

        let view = new UI512ViewDraw();
        let [_, subRect] = view.getSubRectForField(b, el);
        if (!subRect) {
            subRect = [0, 0, 0, 0];
        }

        /* drawBeyondVisible is a perf optimization, telling text render to stop looping
        once it leaves visible area. */
        let fontManager = cast(getRoot().getDrawText(), UI512DrawText);
        let [args, fmtText] = renderTextArgsFromEl(el, subRect, false);
        args.callbackPerChar = callbackPerChar;
        args.drawBeyondVisible = drawBeyondVisible;

        if (measureHeight) {
            /* manually specify a very large height for the field, so we can see where
            the last character will be drawn, effectively measuring height of content */
            args.boxY = 0;
            args.boxH = largeArea;
            args.vScrollAmt = 0;
        }

        let drawn = fontManager.drawFormattedStringIntoBox(fmtText, undefined, args);
        return drawn ? drawn : undefined;
    }

    /**
     * when you click on a letter in a field, which letter did you click on?
    */
    fromMouseCoordsToCaretPosition(el: UI512ElTextField, x: number, y: number) {
        let [found, lowest] = this.getCoordToCharInField(el, x, y, false /* draw beyond visible */);
        if (found) {
            if (found.type === CharRectType.Char) {
                /* split each letter in half. if you clicked on the left side of the letter, go left */
                /* if you clicked on the right side of the letter, go right. */
                let midpoint = found.x + Math.floor(found.w / 2);
                let ret = x > midpoint ? found.charIndex + 1 : found.charIndex;
                ret = fitIntoInclusive(ret, 0, el.get_ftxt().len());
                return ret;
            } else {
                /* padding area always belongs to its adjacent character */
                return found.charIndex;
            }

        } else if (RectUtils.hasPoint(x, y, el.x, el.y, el.w, el.h) && lowest !== undefined && y >= lowest) {
            /* user clicked below all of the text */
            return el.get_ftxt().len();
        } else {
            return undefined;
        }
    }

    getCoordToCharInField(
        el: UI512ElTextField,
        x: number,
        y: number,
        drawBeyondVisible: boolean
    ): [O<FoundCharByLocation>, O<number>] {
        /* if font loaded but pos not seen: return [] */
        /* if font not yet loaded: return undefined */
        let lowest = -1;
        let found: O<FoundCharByLocation>
        let cb = (charindex: number, type: CharRectType, bounds: number[]) => {
            lowest = Math.max(lowest, bounds[1] + bounds[3]);
            if (RectUtils.hasPoint(x, y, bounds[0], bounds[1], bounds[2], bounds[3])) {
                found = new FoundCharByLocation(bounds[0], bounds[1], bounds[2], bounds[3], charindex, type, 0)

                /* signal that we can stop iterating */
                return false;
            } else {
                return true;
            }
        };

        let drawn = this.simulateDrawField(el, false /* measure height */, drawBeyondVisible, cb);
        return drawn ? [found, lowest] : [undefined, undefined];
    }

    getCharacterInFieldToPosition(el: UI512ElTextField, index: number) {
        // if font loaded but char not seen: return []
        // if font not yet loaded: return undefined
        let found: number[] = [];
        let cb = (charindex: number, type: CharRectType, bounds: number[]) => {
            if (type === CharRectType.Char && charindex === index) {
                found = [bounds[0], bounds[1], bounds[2], bounds[3], charindex, type];
                return false; // we can stop iterating now
            } else {
                return true;
            }
        };

        let drawn = this.simulateDrawField(el, false /* measure height */, true /* beyond visible */, cb);
        return drawn ? found : undefined;
    }

    getScrollPosThatWouldMakeStartCaretVisible(el: UI512ElTextField): O<number> {
        el.set('showcaret', true);
        if (!el.get_n('scrollamt') && !el.get_b('scrollbar')) {
            // perf optimization; we don't care about scrolling for non-scrollbar fields.
            return undefined;
        }

        let index = el.get_n('selcaret');
        let contentHeightInPixels = this.getCachedHeightOfField(el);
        if (!contentHeightInPixels) {
            // font not yet loaded
            return undefined;
        }

        let maxscroll = contentHeightInPixels - el.h;
        if (maxscroll <= 0) {
            // we can see everything in the field, no need to set the scroll
            // set scroll to 0
            return 0;
        }

        let found = this.getCharacterInFieldToPosition(el, index);
        if (found && found.length > 0) {
            let drawnY = found[1];
            let drawnBottom = found[1] + found[3];
            let chgScroll = 0;
            if (drawnY > el.y && drawnBottom < el.bottom) {
                // it's already visible, we are ok
            } else if (drawnY <= el.y) {
                chgScroll = drawnY - el.y;
            } else if (drawnBottom >= el.bottom) {
                chgScroll = drawnBottom - el.bottom;
            }

            if (chgScroll !== 0) {
                let scroll = el.get_n('scrollamt') + chgScroll;
                scroll = fitIntoInclusive(scroll, 0, maxscroll);
                return scroll;
            }
        }
    }

    getCachedHeightOfField(el: UI512ElTextField) {
        let cachedHeight = el.get_n('contentHeightInPixels');
        if (cachedHeight && cachedHeight !== -1) {
            return cachedHeight;
        } else {
            let drawn = this.simulateDrawField(el, true /* measure height */, true /* beyond visible */, undefined);
            if (drawn) {
                let ret = drawn.lowestPixelDrawn + ScrollConsts.PadBottomOfField;
                el.set('contentHeightInPixels', ret);
                return ret;
            } else {
                return undefined;
            }
        }
    }

    repositionScrollbarGetThumbPos(el: UI512ElTextField) {
        let contentHeightInPixels = this.getCachedHeightOfField(el);
        if (contentHeightInPixels === undefined) {
            return undefined;
        }

        let maxscroll = contentHeightInPixels - el.h;
        if (maxscroll <= 0) {
            return -1;
        }

        let scrollratio = el.get_n('scrollamt') / (maxscroll + 0.0);
        scrollratio = fitIntoInclusive(scrollratio, 0.0, 1.0);
        return scrollratio;
    }

    onScrollArrowClicked(c: UI512PresenterWithMenuInterface, arrowid: string, amt: number) {
        let fldid = scrollbarPartIdToFldId(arrowid);
        let el = c.app.findElemById(fldid);
        let gel = this.gelFromEl(el);
        if (el && gel) {
            let contentHeightInPixels = el.get_n('contentHeightInPixels');
            if (!contentHeightInPixels || contentHeightInPixels === -1) {
                /* looks like the font hasn't loaded yet. */
                /* for simplicity, let's just ignore this click */
                return;
            }

            let maxscroll = contentHeightInPixels - el.h;
            if (maxscroll <= 0) {
                /* the content is too short for a scrollbar to even be needed */
                return;
            }

            let curscroll = gel.getScrollAmt();
            curscroll += amt;
            curscroll = fitIntoInclusive(curscroll, 0, maxscroll);
            gel.setScrollAmt(curscroll);
        }
    }

    getApproxLineHeight(el: UI512ElTextField, index: number) {
        if (el.get_ftxt().len() === 0) {
            return undefined;
        }

        index = fitIntoInclusive(index, 0, el.get_ftxt().len() - 1);
        let font = el.get_ftxt().fontAt(index);
        let textGetHeight = new FormattedText();
        textGetHeight.push('|'.charCodeAt(0), font);

        let fontmanager = getRoot().getDrawText() as UI512DrawText;
        let args = new RenderTextArgs(0, 0, largeArea, largeArea, false, false, false);
        args.addVSpacing = el.get_n('addvspacing');
        let drawn = fontmanager.drawFormattedStringIntoBox(textGetHeight, undefined, args);
        if (drawn) {
            return drawn.lowestPixelDrawn;
        } else {
            /* font not yet loaded */
            return undefined;
        }
    }
}

export function fldIdToScrollbarPartId(elId: string, partName: string) {
    return elId + '##sb##' + partName;
}

export function scrollbarPartIdToFldId(s: string) {
    let pts = s.split('##sb##');
    assertTrue(pts.length > 1, '2^|unexpected element id');
    return pts[0];
}

export function getAmountIfScrollArrowClicked(elid: string) {
    if (elid.endsWith('##sb##arrowDn')) {
        return 15;
    } else if (elid.endsWith('##sb##arrowUp')) {
        return -15;
    } else if (elid.endsWith('##sb##scrollBgDn')) {
        return 100;
    } else if (elid.endsWith('##sb##scrollBgUp')) {
        return -100;
    } else {
        return undefined;
    }
}
