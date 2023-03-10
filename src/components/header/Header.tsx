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
import React, { useState, useEffect, useRef } from "react";
import { useHistory } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import Axios, { Canceler } from "axios";
import getDisplayName from "react-display-name";

//Foundation libraries
import { useSite } from "../../_foundation/hooks/useSite";
import categoryService from "../../_foundation/apis/search/categories.service";

//Custom libraries
import { headerConfig } from "./headerConstant";
import { TOP_CATEGORIES_DEPTH_LIMIT } from "../../configs/catalog";
import { MINICART_CONFIGS } from "../../configs/order";
import * as ROUTES from "../../constants/routes";
import { ContentRecommendationLayout } from "../widgets/content-recommendation";
import MiniCart from "./MiniCart";
import MegaMenu from "./MegaMenu";
import ExpandedMenu from "./ExpandedMenu";
import { SearchBar } from "../widgets/search-bar";
import AccountPopperContent from "./AccountPopperContent";
import SuccessMessageSnackbar from "../widgets/message-snackbar/SuccessMessageSnackbar";
import ErrorMessageSnackbar from "../widgets/message-snackbar/ErrorMessageSnackbar";

//Redux
import { userNameSelector } from "../../redux/selectors/user";
import { ORG_SWITCH_ACTION } from "../../redux/actions/organization";
import { CONTRACT_SWITCH_ACTION } from "../../redux/actions/contract";
import { LOGOUT_REQUESTED_ACTION } from "../../redux/actions/user";
import { currentContractIdSelector } from "../../redux/selectors/contract";
import { successSelector } from "../../redux/selectors/success";
import { SuccessMessageReducerState } from "../../redux/reducers/reducerStateInterface";
//UI
import MenuIcon from "@material-ui/icons/Menu";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { useTheme } from "@material-ui/core/styles";
import { ClickAwayListener } from "@material-ui/core";
import AccountBoxIcon from "@material-ui/icons/AccountBox";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { Hidden } from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import {
  StyledAccountPopper,
  StyledButton,
  StyledContainer,
  StyledHeader,
  StyledHeaderActions,
  StyledTypography,
  StyledSwipeableDrawer,
  StyledGrid,
  StyledLink,
  StyledPaper,
  StyledBox,
  StyledSearchBarButton,
} from "../StyledUI";

interface HeaderProps {
  loggedIn: boolean;
}

/**
 * Header component
 * displays Header, Mini Cart and Mega Menu
 * @param props
 */
const Header: React.FC<HeaderProps> = (props: any) => {
  const widgetName = getDisplayName(Header);

  const history = useHistory();
  const [open, setOpen] = useState<boolean>(false);
  const [showSearchBar, setShowSearchBar] = useState<boolean>(false);
  const [topCategories, setTopCategories] = useState<Array<any>>([]);
  const [myAccountPopperOpen, setMyAccountPopperOpen] =
    useState<boolean>(false);
  const myAccountElRef = useRef<HTMLButtonElement>(null);

  const [miniCartPopperOpen, setMiniCartPopperOpen] = useState<boolean>(false);
  const miniCartElRef = useRef<HTMLButtonElement>(null);

  const { mySite } = useSite();
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();

  const { firstName, lastName } = useSelector(userNameSelector);
  const contractId = useSelector(currentContractIdSelector);
  const success: SuccessMessageReducerState = useSelector(successSelector);

  const isB2B = Boolean(mySite?.isB2B);
  const loggedIn = props.loggedIn;
  const isShoppingEnabled = !isB2B || (isB2B && loggedIn);

  const isMobile = !useMediaQuery(theme.breakpoints.up("sm"));
  const isTablet = !useMediaQuery(theme.breakpoints.up("md"));

  const myAccountPopperId = "HEADER_MY_ACCOUNT_Popper";
  const miniCartPopperId = "HEADER_MINI_CART_Popper";
  const CancelToken = Axios.CancelToken;
  let cancels: Canceler[] = [];
  const payloadBase: any = {
    widget: widgetName,
    cancelToken: new CancelToken(function executor(c) {
      cancels.push(c);
    }),
  };
  const payload = {
    ...payloadBase,
  };

  const handleMyAccountClick = () => {
    setMyAccountPopperOpen(true);
    setMiniCartPopperOpen(false);
  };
  const handleMyAccountPopperClose = () => setMyAccountPopperOpen(false);

  const handleMiniCartClick = () => {
    setMiniCartPopperOpen(true);
    setMyAccountPopperOpen(false);

    setTimeout(() => {
      window.scrollTo(0, 0);
    });
    setTimeout(() => {
      if (miniCartElRef !== null && miniCartElRef.current !== null) {
        miniCartElRef.current.focus();
      }
    }, 100);
  };
  const handleMiniCartPopperClose = () => setMiniCartPopperOpen(false);

  const handleOrgChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    event.persist();
    event.preventDefault();
    const orgId = event.target.value;
    dispatch(
      ORG_SWITCH_ACTION({
        $queryParameters: { activeOrgId: String(orgId) },
        ...payload,
      })
    );
    history.push(ROUTES.HOME);
  };

  const handleContractChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    event.persist();
    event.preventDefault();
    const conId = event.target.value;
    dispatch(
      CONTRACT_SWITCH_ACTION({
        $queryParameters: { contractId: String(conId) },
        ...payloadBase,
      })
    );
    history.push(ROUTES.HOME);
  };

  const handleLogout = (event) => {
    event.preventDefault();
    const param: any = {
      ...payload,
    };
    dispatch(LOGOUT_REQUESTED_ACTION(param));
    setMyAccountPopperOpen(false);
    setMiniCartPopperOpen(false);
    history.push(ROUTES.HOME);
  };

  useEffect(() => {
    if (mySite !== null && contractId !== undefined) {
      const storeID: string = mySite.storeID;
      const parameters: any = {
        storeId: storeID,
        depthAndLimit: TOP_CATEGORIES_DEPTH_LIMIT,
        $queryParameters: {
          contractId: contractId,
        },
        ...payload,
      };
      categoryService
        .getV2CategoryResourcesUsingGET(parameters, null, mySite.searchContext)
        .then((res) => {
          setTopCategories(res.data.contents);
        })
        .catch((e) => {});
    }
    return () => {
      cancels.forEach((cancel) => cancel());
    };
  }, [mySite, contractId]);

  useEffect(() => {
    if (success && success.key) {
      if (MINICART_CONFIGS.itemAddSuccessMsgKeys.includes(success.key)) {
        handleMiniCartClick();
      }
    }
  }, [success]);

  return (
    <>
      <StyledHeader>
        <StyledContainer>
          <StyledGrid container justify="space-between" alignItems="center">
            <StyledGrid
              className="header-topbarSection"
              item
              container
              alignItems="center"
              spacing={2}>
              <Hidden mdUp>
                <StyledGrid item>
                  <button
                    className="menu-hamburger"
                    data-testid="menu-hamburger-element"
                    onClick={() => setOpen(!open)}>
                    <MenuIcon />
                  </button>
                </StyledGrid>
              </Hidden>
              {mySite != null && (
                <StyledGrid item>
                  <div className="header-branding">
                    <ContentRecommendationLayout
                      cid="header"
                      eSpot={headerConfig.espot}
                      page={headerConfig.page}></ContentRecommendationLayout>
                  </div>
                </StyledGrid>
              )}

              <Hidden smDown>
                <StyledGrid
                  item
                  data-testid="search-bar-desktop-largetablet-element">
                  <SearchBar
                    showSearchBar={showSearchBar}
                    closeSearchBar={() => setShowSearchBar(false)}
                    openSearchBar={() => setShowSearchBar(true)}
                  />
                </StyledGrid>
              </Hidden>
            </StyledGrid>

            <StyledGrid
              className="header-topbarSection"
              item
              container
              alignItems="center">
              <Hidden mdUp>
                <StyledGrid item data-testid="search-bar-mobile-element">
                  <StyledSearchBarButton
                    onClick={() => setShowSearchBar(!showSearchBar)}
                    className={`header-actionsButton ${
                      showSearchBar && "active"
                    }`}>
                    <SearchIcon />
                  </StyledSearchBarButton>
                </StyledGrid>
              </Hidden>
              {isShoppingEnabled && (
                <StyledGrid item>
                  <MiniCart
                    id={miniCartPopperId}
                    open={miniCartPopperOpen}
                    handleClick={handleMiniCartClick}
                    handleClose={handleMiniCartPopperClose}
                    ref={miniCartElRef}
                  />
                </StyledGrid>
              )}
              {loggedIn ? (
                <StyledGrid item>
                  <StyledButton
                    ref={myAccountElRef}
                    variant="text"
                    color="secondary"
                    className="header-actionsButton"
                    onClick={handleMyAccountClick}>
                    {isTablet ? (
                      <StyledHeaderActions>
                        <AccountBoxIcon />
                        <StyledTypography variant="body1" component="p">
                          {isMobile
                            ? t("Header.Actions.Account")
                            : t("Header.Actions.YourAccount")}
                        </StyledTypography>
                      </StyledHeaderActions>
                    ) : (
                      <StyledBox
                        className="welcome-text"
                        display="flex"
                        flexDirection="column">
                        <StyledTypography variant="button" component="p">
                          {firstName
                            ? t("Header.Actions.WelcomeFirstname", {
                                firstName,
                              })
                            : t("Header.Actions.WelcomeNoFirstname", {
                                lastName,
                              })}
                        </StyledTypography>

                        <StyledBox
                          display="flex"
                          flexDirection="row"
                          alignItems="center"
                          flexWrap="wrap">
                          <StyledTypography variant="body2">
                            {t("Header.Actions.YourAccount")}???????????????
                          </StyledTypography>
                          {myAccountPopperOpen ? (
                            <ExpandLessIcon />
                          ) : (
                            <ExpandMoreIcon />
                          )}
                        </StyledBox>
                      </StyledBox>
                    )}
                  </StyledButton>
                  <StyledAccountPopper
                    id={myAccountPopperId}
                    open={myAccountPopperOpen}
                    anchorEl={myAccountElRef.current}
                    onClose={handleMyAccountPopperClose}
                    placement="bottom-end"
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
                    }}
                    className="account-popper">
                    <ClickAwayListener onClickAway={handleMyAccountPopperClose}>
                      <StyledPaper className="horizontal-padding-2">
                        <StyledTypography variant="body1" component="div">
                          <AccountPopperContent
                            handleClose={handleMyAccountPopperClose}
                            handleOrgChange={handleOrgChange}
                            handleContractChange={handleContractChange}
                            handleLogout={handleLogout}
                            isB2B={isB2B}
                            userName={{ firstName, lastName }}
                          />
                        </StyledTypography>
                      </StyledPaper>
                    </ClickAwayListener>
                  </StyledAccountPopper>
                </StyledGrid>
              ) : (
                <StyledLink to={ROUTES.SIGNIN}>
                  {isMobile ? (
                    <StyledButton
                      className="header-actionsButton"
                      variant="text"
                      color="secondary">
                      <StyledHeaderActions>
                        <AccountBoxIcon />
                        <StyledTypography variant="body1" component="p">
                          {t("Header.Actions.SignIn")}
                        </StyledTypography>
                      </StyledHeaderActions>
                    </StyledButton>
                  ) : (
                    <StyledButton
                      className="header-actionsButton"
                      variant="text"
                      color="secondary">
                      <StyledHeaderActions>
                        <AccountBoxIcon />
                        <StyledTypography variant="body1" component="p">
                          {t("Header.Actions.SignIn")}
                        </StyledTypography>
                      </StyledHeaderActions>
                    </StyledButton>
                  )}
                </StyledLink>
              )}
            </StyledGrid>
          </StyledGrid>
        </StyledContainer>

        {showSearchBar && (
          <Hidden mdUp>
            <StyledContainer className="bottom-padding-1">
              <SearchBar
                showSearchBar={showSearchBar}
                closeSearchBar={() => setShowSearchBar(false)}
                openSearchBar={() => setShowSearchBar(true)}
              />
            </StyledContainer>
          </Hidden>
        )}

        <Hidden smDown>
          <ExpandedMenu pages={topCategories} />
        </Hidden>

        <StyledSwipeableDrawer
          anchor={useMediaQuery(theme.breakpoints.up("sm")) ? "top" : "left"}
          open={open}
          onClose={() => setOpen(false)}
          onOpen={() => setOpen(true)}
          className="header-menu"
          data-testid="header-menu-drawer-element">
          <StyledContainer>
            <StyledGrid
              container
              spacing={2}
              className={"menu-container " + (open ? "open" : "")}>
              <MegaMenu
                menutitle={t("MegaMenu.Title")}
                pages={topCategories}
                closeMegaMenu={() => setOpen(false)}></MegaMenu>
            </StyledGrid>
          </StyledContainer>
        </StyledSwipeableDrawer>
      </StyledHeader>
      <SuccessMessageSnackbar />
      <ErrorMessageSnackbar />
    </>
  );
};

export { Header };
