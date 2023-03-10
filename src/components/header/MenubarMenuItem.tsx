/*
 *==================================================
 * Licensed Materials - Property of HCL Technologies
 *
 * HCL Commerce
 *
 * (C) Copyright HCL Technologies Limited 2020
 *
 *==================================================
 */
//Standard libraries
import React, { useRef } from "react";
import { ClickAwayListener } from "@material-ui/core";
//style
import {
  StyledBox,
  StyledButton,
  StyledTypography,
  StyledPopper,
} from "../StyledUI";
//custom
import AllCategoriesExpandedMenu from "./AllCategoriesExpandedMenu";
import ExpandedMenuItem from "./ExpandedMenuItem";

const MenubarMenuItem = (props) => {
  const { page, selectMenuItem, selectedMenuItem } = props;
  const popperRef: React.RefObject<HTMLButtonElement> =
    useRef<HTMLButtonElement>(null);
  const handleClickAway = (event) => {
    const target = event.target;
    if (
      popperRef.current &&
      (popperRef.current.contains(target) || popperRef.current === target)
    ) {
      return;
    }
    if (selectedMenuItem.id === page.id) {
      selectMenuItem(null);
    }
  };
  const POPPER_ID = `MENU_POPPER_${page.id}`;
  const setWidth = (data) => {
    const { width } = data.offsets.reference;
    if (width > data.popper.width) {
      data.styles.width = width;
    }
    return data;
  };
  return (
    <>
      <StyledBox
        p={2}
        mr={1}
        ml={1}
        className={
          selectedMenuItem !== null && selectedMenuItem.id === page.id
            ? "expanded-menu-hover"
            : "expanded-menu"
        }
        ref={popperRef}>
        <StyledButton
          variant="text"
          onMouseOver={() => selectMenuItem(page.id)}>
          <StyledTypography
            className="expanded-menu-text"
            variant="body1"
            data-testid="menubar-menuitem-button">
            {page.name}
          </StyledTypography>
        </StyledButton>
      </StyledBox>

      <StyledPopper
        id={POPPER_ID}
        data-testid={POPPER_ID}
        open={selectedMenuItem !== null && selectedMenuItem.id === page.id}
        anchorEl={popperRef.current}
        placement="bottom-start"
        disablePortal
        modifiers={{
          flip: {
            enabled: false,
          },
          preventOverflow: {
            enabled: false,
            boundariesElement: "scrollParent",
          },
          hide: {
            enabled: true,
          },
          updateWidth: {
            enabled: true,
            order: 875,
            fn: setWidth,
          },
        }}>
        <ClickAwayListener onClickAway={handleClickAway}>
          <StyledBox>
            {page.id === "allCategories" ? (
              <AllCategoriesExpandedMenu
                pages={page.children}></AllCategoriesExpandedMenu>
            ) : (
              <ExpandedMenuItem page={page}></ExpandedMenuItem>
            )}
          </StyledBox>
        </ClickAwayListener>
      </StyledPopper>
    </>
  );
};

export default MenubarMenuItem;
