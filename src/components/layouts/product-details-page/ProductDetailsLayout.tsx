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
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Axios, { Canceler } from "axios";
import { useDispatch, useSelector } from "react-redux";
import ReactHtmlParser from "react-html-parser";
import getDisplayName from "react-display-name";
//Foundation libraries
import inventoryavailabilityService from "../../../_foundation/apis/transaction/inventoryavailability.service";
import associatedPromotionCodeService from "../../../_foundation/apis/transaction/associatedPromotionCode.service";
import productsService from "../../../_foundation/apis/search/products.service";
import { useSite } from "../../../_foundation/hooks/useSite";
//Custom libraries
import {
  OFFER,
  DISPLAY,
  DEFINING,
  DESCRIPTIVE,
  STRING_TRUE,
} from "../../../constants/common";
import { AttachmentLayout } from "./AttachmentLayout";
import { ATTR_IDENTIFIER } from "../../../constants/catalog";
import FormattedPriceDisplay from "../../widgets/formatted-price-display";
import ProductImage from "./ProductImage";
import ProductThumbnails from "./ProductThumbnails";
import ProductQuantity from "./ProductQuantity";
import ProductAttributes from "./ProductAttributes";
//Redux
import { currentContractIdSelector } from "../../../redux/selectors/contract";
import { breadcrumbsSelector } from "../../../redux/selectors/catalog";
import * as orderActions from "../../../redux/actions/order";
//UI
import {
  StyledGrid,
  StyledPDPContainer,
  StyledTypography,
  StyledButton,
  StyledTabs,
  ITabs,
} from "../../StyledUI";
import Hidden from "@material-ui/core/Hidden";
//GA360
import GADataService from "../../../_foundation/gtm/gaData.service";

interface CurrentSelectionType {
  sku: any;
  quantity: number;
  selectedAttributes: any;
}

/**
 * Product Display component
 * displays product defining atrributes, descriptive atrributes, availability, promotions etc.
 * @param productPartNumber
 * @param pdpData
 * @param storeId
 */
function ProductDetailsLayout({ productPartNumber, pdpData, storeId }: any) {
  const widgetName = getDisplayName(ProductDetailsLayout);

  const ONLINE_STORE_KEY: string = "Online";
  const AVAILABLE_KEY: string = "Available";
  let cancels: Canceler[] = [];
  const CancelToken = Axios.CancelToken;
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [promotion, setPromotion] = useState<Array<any>>([]);
  const [inventoryAvailableFlag, setInventoryAvailableFlag] =
    useState<boolean>(true);
  const [buyableFlag, setBuyableFlag] = useState<boolean>(true);

  const CURRENT_SELECTION_INIT: CurrentSelectionType = {
    sku: {},
    quantity: 1,
    selectedAttributes: {},
  };

  const [product, setProduct] = useState<any>(null);

  const [currentSelection, setCurrentSelection] =
    useState<CurrentSelectionType>(CURRENT_SELECTION_INIT);

  const [displayName, setDisplayName] = useState<string>("");
  const [displayPartNumber, setDisplayPartNumber] =
    useState<string>(productPartNumber);
  const [displayShortDesc, setDisplayShortDesc] = useState<string>("");
  const [displayOfferPrice, setDisplayOfferPrice] = useState<number>(0);
  const [displayListPrice, setDisplayListPrice] = useState<number>(0);
  const [displayFullImage, setDisplayFullImage] = useState<string>("");
  const [displayLongDesc, setDisplayLongDesc] = useState<string>("");
  const [displayDescriptiveAttrList, setDisplayDescriptiveAttrList] = useState<
    any[]
  >([]);

  const [definingAttrList, setDefiningAttrList] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [attachmentsList, setAttachmentsList] = useState<any[]>([]);
  const contract = useSelector(currentContractIdSelector);

  const [showCarousel, setShowCarousel] = React.useState<boolean>(false);
  const [carouselImages, setCarouselImages] = React.useState<any[]>([]);

  const [skuColor, setSkuColor] = React.useState<string>("");
  const [index, setIndex] = React.useState<number>(0);

  const payloadBase: any = {
    storeId: storeId,
    widget: widgetName,
    cancelToken: new CancelToken(function executor(c) {
      cancels.push(c);
    }),
  };

  const { mySite } = useSite();

  /**
   * Get product information based on its type
   */
  const getProduct = (catentry: any) => {
    if (catentry) {
      if (catentry.type === "product" || catentry.type === "variant") {
        setProduct(catentry);
        initializeProduct(catentry);
        getAssociatedPromotions(catentry);
      } else if (catentry.type === "item" && catentry.parentCatalogEntryID) {
        let productsId: string[] = [];
        productsId.push(catentry.parentCatalogEntryID);
        const parameters: any = {
          ...payloadBase,
          id: productsId,
          contractId: contract,
        };
        productsService
          .findProductsUsingGET(parameters)
          .then((res) => {
            if (res.data.contents && res.data.contents.length > 0) {
              initializeProduct(res.data.contents[0], catentry.attributes);
              getAssociatedPromotions(res.data.contents[0]);
              setProduct(res.data.contents[0]);
            }
          })
          .catch((e) => {
            console.log("could not retreive the parent product details", e);
          });
      }
    }
  };

  /**
   * Get associated promotions for the product
   */
  const getAssociatedPromotions = (productInfo) => {
    if (productInfo) {
      let promotion: any[] = [];
      const parameters: any = {
        ...payloadBase,
        q: "byProduct",
        qProductId: productInfo.id,
      };
      associatedPromotionCodeService
        .findPromotionsByProduct(parameters)
        .then((res) => {
          if (res.data.associatedPromotions) {
            for (let promo of res.data.associatedPromotions) {
              if (promo.description)
                promotion = promo.description.shortDescription;
            }
            setPromotion(promotion);
          }
        })
        .catch((e) => {
          console.log(
            "Could not retrieve product associated promotion details",
            e
          );
        });
    }
  };

  /**
   * Set the display information on the page using the specified catentry data
   * @param catentry Catentry info to use for display; either item/product/variant
   * @param productInfo Product data to fall back to if needed
   */
  const setDisplayInfo = (catentry: any, productInfo?: any) => {
    if (catentry) {
      if (catentry.name) {
        setDisplayName(catentry.name);
      } else {
        setDisplayName("");
      }

      if (catentry.partNumber) {
        setDisplayPartNumber(catentry.partNumber);
      } else {
        setDisplayPartNumber("");
      }

      if (catentry.shortDescription) {
        setDisplayShortDesc(catentry.shortDescription);
      } else {
        setDisplayShortDesc("");
      }

      if (catentry.price?.length > 0) {
        setDisplayPrices(catentry.price);
      } else {
        setDisplayPrices([]);
      }

      if (catentry.attributes?.length > 0) {
        getDescriptiveAttributes(catentry.attributes);
      } else if (productInfo?.attributes?.length > 0) {
        //Fallback to product's descriptive attributes
        getDescriptiveAttributes(productInfo.attributes);
      } else {
        getDescriptiveAttributes([]);
      }

      if (catentry.longDescription) {
        setDisplayLongDesc(catentry.longDescription);
      } else if (productInfo?.longDescription) {
        //Fallback to product's long description
        setDisplayLongDesc(productInfo.longDescription);
      } else {
        setDisplayLongDesc("");
      }

      if (catentry.fullImage) {
        setDisplayFullImage(catentry.fullImage);
      } else {
        setDisplayFullImage("");
      }
      /**
       * This behavior for attachment is:
       * Product level attachments will be pushed down to its underlying SKUs which do not have its own attachment
       * SKUs can have its own attachment override and Search can also index those SKU level attachment overrides, instead of inheriting from the product
       * however,  these SKU level attachment overrides will not be "rolled" back up to the product level
       */
      if (catentry.attachments?.length > 0) {
        setAttachmentsList(catentry.attachments);
      } else if (productInfo?.attachments?.length > 0) {
        //Fallback to product's attachments, this may not needed.
        setAttachmentsList(productInfo.attachments);
      } else {
        setAttachmentsList([]);
      }
    }
  };

  /**
   * Get product details based upon the available attributes
   * @param productInfo
   * @param attr
   */
  const initializeProduct = (productInfo: any, attr?: any) => {
    let newSelection = { ...currentSelection };
    if (productInfo) {
      setDisplayInfo(productInfo);
      if (productInfo.attributes) {
        getDefiningAttributes(productInfo.attributes);
      }
      if (productInfo.items?.length > 0) {
        newSelection.sku = productInfo.items[0];
        if (attr) {
          initializeSelectedAttributes(newSelection, productInfo, attr);
        } else if (newSelection.sku.attributes) {
          initializeSelectedAttributes(
            newSelection,
            productInfo,
            newSelection.sku.attributes
          );
        }

        if (newSelection.selectedAttributes["Color"]) {
          let color = newSelection.selectedAttributes["Color"];
          color = color.charAt(0).toUpperCase() + color.slice(1);
          setSkuColor(color);
        }

        if (newSelection.sku.images?.length > 1) {
          setIndex(0);
          setCarouselImages(newSelection.sku.images);
          setShowCarousel(true);
        }
      } else {
        setBuyableFlag(false);
      }
    }
    setCurrentSelection(newSelection);
  };

  /**
   * Validate SKU based upon the selected attributes
   * @param attr
   */
  const initializeSelectedAttributes = (
    newSelection: CurrentSelectionType,
    productInfo: any,
    attr?: any
  ) => {
    if (productInfo?.items) {
      newSelection.selectedAttributes = {};
      if (attr) {
        for (const att of attr) {
          newSelection.selectedAttributes[att.identifier] =
            att.values[0].identifier;
        }
      } else {
        for (const att of newSelection.sku.attributes) {
          newSelection.selectedAttributes[att.identifier] =
            att.values[0].identifier;
        }
      }

      newSelection.sku = resolveSKU(
        productInfo.items,
        newSelection.selectedAttributes
      );
      if (newSelection.sku === "") {
        setAvailability([]);
        setBuyableFlag(false);
      } else {
        setDisplayInfo(newSelection.sku, productInfo);
        if (newSelection.sku.buyable === STRING_TRUE) {
          setBuyableFlag(true);
        } else {
          setBuyableFlag(false);
        }
      }
    }
  };

  /**
   *Get the SKU details from product SKUs and selected attributes
   *@param skus
   *@param selectedAttributes
   */
  const resolveSKU = (skus: any, selectedAttributes: any): any => {
    if (skus) {
      for (const s of skus) {
        if (s.attributes) {
          const values = s.attributes.reduce((value: any, a: any) => {
            value[a.identifier] = a.values[0].identifier;
            return value;
          }, {});

          let match = true;
          for (const key in selectedAttributes) {
            match = match && selectedAttributes[key] === values[key];
          }
          if (match) {
            return s;
          }
        }
      }
    }
    /* istanbul ignore next */
    return "";
  };

  /**
   *Get the inventory details of the product
   * @param catentryId
   */
  const getInventory = (catentryId: string) => {
    let preferredStore: any; // TODO need to check & implement
    let physicalStoreId: string = "";
    if (preferredStore) {
      physicalStoreId = preferredStore.storeId;
    }
    const parameters: any = {
      ...payloadBase,
      productIds: catentryId,
    };

    let newAvailability: any[];

    inventoryavailabilityService
      .getInventoryAvailabilityByProductId(parameters)
      .then((res) => {
        newAvailability = [];
        if (res.data.InventoryAvailability !== undefined) {
          let onlineInventory = res.data.InventoryAvailability.find(
            (inventory: any) => inventory.onlineStoreId
          );
          newAvailability.push({
            storeId: onlineInventory?.onlineStoreId,
            storeName: ONLINE_STORE_KEY,
            inventoryStatus:
              onlineInventory?.inventoryStatus === AVAILABLE_KEY ? true : false,
          });
          for (let inventory of res.data.InventoryAvailability) {
            if (inventory.physicalStoreId && inventory.physicalStoreName) {
              newAvailability.push({
                storeId: inventory.physicalStoreId,
                storeName: inventory.physicalStoreName,
                inventoryStatus:
                  inventory.inventoryStatus === AVAILABLE_KEY ? true : false,
              });
            } else if (
              inventory.physicalStoreId &&
              !inventory.physicalStoreName
            ) {
              newAvailability.push({
                storeId: inventory.physicalStoreId,
                storeName: inventory.physicalStoreId,
                inventoryStatus:
                  inventory.inventoryStatus === AVAILABLE_KEY ? true : false,
              });
            }
          }
        }

        if (newAvailability.length === 0) {
          setInventoryAvailableFlag(false);
        } else {
          //Check whether returned inventory is actually available
          //Only check against online store for now
          const selectedStoreInventory = newAvailability.find(
            (inventory: any) => inventory.storeId === storeId
          );
          if (selectedStoreInventory) {
            setInventoryAvailableFlag(selectedStoreInventory.inventoryStatus);
          } else {
            setInventoryAvailableFlag(false);
          }
        }
        setAvailability(newAvailability);
      })
      .catch((e) => {
        console.log("Could not retrieve Inventory Details", e);
      });
  };

  /**
   * Get the descriptive attributes
   */
  const getDescriptiveAttributes = (attributesArray: any[]) => {
    if (attributesArray) {
      let newDescriptiveAttrList: any[] = [];
      for (const att of attributesArray) {
        if (
          att.usage === DESCRIPTIVE &&
          att.displayable &&
          att.identifier !== ATTR_IDENTIFIER.PickUp &&
          !att.identifier.startsWith(ATTR_IDENTIFIER.RibbonAd)
        ) {
          newDescriptiveAttrList.push(att);
        }
      }
      setDisplayDescriptiveAttrList(newDescriptiveAttrList);
    }
  };

  /**
   * Get the defining attributes
   */
  const getDefiningAttributes = (attributesArray: any[]) => {
    if (attributesArray) {
      let newDefiningAttrList: any[] = [];
      for (const att of attributesArray) {
        if (att.usage === DEFINING) {
          newDefiningAttrList.push(att);
        }
      }
      setDefiningAttrList(newDefiningAttrList);
    }
  };

  /**
   * Defining attribute change event handler
   * @param attr
   * @param e
   */
  const onAttributeChange = (attr: string, e: string) => {
    if (product?.items) {
      let newSelection = { ...currentSelection };
      if (e && newSelection && newSelection.selectedAttributes) {
        newSelection.selectedAttributes[attr] = e;
      }

      newSelection.sku = resolveSKU(
        product.items,
        newSelection.selectedAttributes
      );
      if (newSelection.sku === "") {
        setBuyableFlag(false);
        setAvailability([]);
      } else {
        setDisplayInfo(newSelection.sku, product);
        if (newSelection.sku.buyable === STRING_TRUE) {
          setBuyableFlag(true);
        } else {
          setBuyableFlag(false);
        }

        if (newSelection.selectedAttributes["Color"]) {
          let color = newSelection.selectedAttributes["Color"];
          color = color.charAt(0).toUpperCase() + color.slice(1);
          setSkuColor(color);
        }

        if (newSelection.sku.images?.length > 1) {
          setIndex(index);
          setCarouselImages(newSelection.sku.images);
          setShowCarousel(true);
          setDisplayFullImage(newSelection.sku.images[index]?.fullImageRaw);
        }
      }
      setCurrentSelection(newSelection);
    }
  };

  const changeMainImage = (index: number) => {
    setIndex(index);
    const imageJson = carouselImages[index];
    const fullImage = imageJson.fullImageRaw;
    setDisplayFullImage(fullImage);
  };

  /**
   * Set the product offer price and display price
   * @param priceArray
   */
  const setDisplayPrices = (priceArray: any[]) => {
    if (priceArray) {
      let offer: string = "0";
      let list: string = "0";
      for (const price of priceArray) {
        if (price.usage === OFFER && price.value !== "") {
          offer = price.value;
        } else if (price.usage === DISPLAY && price.value !== "") {
          list = price.value;
        }
      }
      setDisplayOfferPrice(parseFloat(offer));
      setDisplayListPrice(parseFloat(list));
    }
  };

  /**
   * Product quantity input field value change event handler
   * @param e
   */
  const updateProductQuantity = (e: number) => {
    let newSelection = { ...currentSelection };
    newSelection.quantity = e;
    setCurrentSelection(newSelection);
  };

  /**
   *Add the selected product to the shopping cart
   */
  const addToCart = () => {
    const param = {
      partnumber: [currentSelection.sku.partNumber],
      quantity: [currentSelection.quantity.toString()],
      contractId: contract,
      ...payloadBase,
    };
    dispatch(orderActions.ADD_ITEM_ACTION(param));
    //GA360
    if (mySite.enableGA)
      GADataService.sendAddToCartEvent(currentSelection, breadcrumbs);
  };

  React.useEffect(() => {
    const inputCatentryData = pdpData ? pdpData[0] : null;
    if (inputCatentryData !== undefined && inputCatentryData !== null) {
      getProduct(inputCatentryData);
      if (inputCatentryData.attachments?.length > 0) {
        setAttachmentsList(inputCatentryData.attachments);
      }
    }
    return () => {
      cancels.forEach((cancel) => cancel());
    };
  }, []);

  React.useEffect(() => {
    if (currentSelection?.sku?.id) {
      getInventory(currentSelection.sku.id);
    }
  }, [currentSelection?.sku]);

  let productDetailTabsChildren: ITabs[] = [];

  if (displayLongDesc) {
    const descriptionElement = (
      <StyledTypography variant="body1" style={{ maxWidth: "65ch" }}>
        {ReactHtmlParser(displayLongDesc)}
      </StyledTypography>
    );
    productDetailTabsChildren.push({
      title: t("productDetail.Description"),
      tabContent: descriptionElement,
    });
  }

  if (displayDescriptiveAttrList.length > 0) {
    const productDetailsElement = (
      <div
        id={`product-details-container_${productPartNumber}`}
        className="product-details-container">
        {displayDescriptiveAttrList.map((e: any) => (
          <StyledTypography
            variant="body1"
            key={`li_${e.identifier}`}
            id={`product_attribute_${productPartNumber}`}>
            <b
              key={`span_name_${e.identifier}`}
              id={`product_desc_attribute_name_${e.identifier}_${productPartNumber}`}>
              {e.name}:
            </b>
            {e.values.map((value: any) => (
              <span
                id={`product_attribute_value_${value.identifier}_${productPartNumber}`}
                key={value.identifier}>
                {" " + value.value}
              </span>
            ))}
          </StyledTypography>
        ))}
      </div>
    );
    productDetailTabsChildren.push({
      title: t("productDetail.ProductDetails"),
      tabContent: productDetailsElement,
    });
  }

  if (attachmentsList.length > 0) {
    const productAttachmentElement = (
      <AttachmentLayout
        attachmentsList={attachmentsList}
        productPartNumber={productPartNumber}
      />
    );
    productDetailTabsChildren.push({
      title: t("productDetail.Attachments"),
      tabContent: productAttachmentElement,
    });
  }

  //GA360
  const breadcrumbs = useSelector(breadcrumbsSelector);
  useEffect(() => {
    if (mySite.enableGA) {
      if (currentSelection && breadcrumbs.length !== 0) {
        GADataService.sendPDPPageViewEvent(breadcrumbs);
        GADataService.sendPDPDetailViewEvent(currentSelection, breadcrumbs);
      }
    }
  }, [breadcrumbs]);

  return (
    <>
      {productPartNumber && product && (
        <StyledPDPContainer
          itemScope
          itemType="http://schema.org/Product"
          id={`product-image-details_${productPartNumber}`}>
          <StyledGrid container>
            <StyledGrid container spacing={2} item xs={12}>
              {showCarousel ? (
                <>
                  <StyledGrid item xs={12} md={1}>
                    <ProductThumbnails
                      imageList={carouselImages}
                      changeMainImage={changeMainImage}
                      index={index}
                    />
                  </StyledGrid>
                  <Hidden smDown>
                    <StyledGrid item xs={5} className="product-image">
                      <ProductImage
                        fullImage={displayFullImage}
                        isAngleImage={false}
                        alt={displayName}
                      />
                    </StyledGrid>
                  </Hidden>
                </>
              ) : (
                <StyledGrid item xs={12} md={6} className="product-image">
                  <ProductImage
                    fullImage={displayFullImage}
                    isAngleImage={false}
                    alt={displayName}
                  />
                </StyledGrid>
              )}
              <StyledGrid item xs={12} sm={6} lg={5}>
                {displayName && (
                  <StyledTypography
                    variant="h4"
                    itemProp="name"
                    className="product-name">
                    {displayName}
                  </StyledTypography>
                )}
                {displayPartNumber && (
                  <StyledTypography variant="body2" className="product-sku">
                    {t("productDetail.SKU")}: {displayPartNumber}
                  </StyledTypography>
                )}
                {displayShortDesc && (
                  <StyledTypography
                    variant="body1"
                    itemProp="description"
                    className="product-shortDescription">
                    {displayShortDesc}
                  </StyledTypography>
                )}
                {promotion && (
                  <StyledTypography
                    variant="body2"
                    id={`product_advertisement_${productPartNumber}`}
                    className="product-promo"
                    gutterBottom>
                    {promotion}
                  </StyledTypography>
                )}
                <div
                  itemProp="offers"
                  itemScope
                  itemType="http://schema.org/Offer">
                  {product.type !== "bundle" && (
                    <>
                      <StyledTypography
                        variant="h5"
                        className="product-price-container">
                        {displayOfferPrice > 0 && (
                          <span className="product-price">
                            <FormattedPriceDisplay min={displayOfferPrice} />
                          </span>
                        )}
                        {displayListPrice > 0 && (
                          <span
                            id={`product_price_${productPartNumber}`}
                            className={
                              displayListPrice > 0 ? "strikethrough" : ""
                            }>
                            <FormattedPriceDisplay min={displayListPrice} />
                          </span>
                        )}
                        {displayOfferPrice === 0 && displayListPrice === 0 && (
                          <span id={`product_offer_price_${productPartNumber}`}>
                            {<FormattedPriceDisplay min={null} />}
                          </span>
                        )}
                      </StyledTypography>
                      {definingAttrList?.length > 0 && (
                        <ProductAttributes
                          skuColor={skuColor}
                          attributeList={definingAttrList}
                          onChangeHandler={onAttributeChange}
                          currentSelection={currentSelection}
                        />
                      )}
                      <>
                        <StyledTypography
                          variant="body2"
                          className="product-quantity">
                          {t("productDetail.Quantity")}
                        </StyledTypography>
                        <ProductQuantity
                          updateProductQuantity={updateProductQuantity}
                          value={currentSelection.quantity}
                        />
                        {availability?.length > 0 && (
                          <>
                            <StyledTypography
                              variant="body2"
                              className="product-availability">
                              {t("productDetail.Availability")}
                            </StyledTypography>
                            <StyledTypography variant="body1" component="div">
                              {availability.map((e: any) => (
                                <div key={`inventoryDetails_div_${e.storeId}`}>
                                  <div
                                    key={`store-name_div_${e.storeId}`}
                                    id={`product_availability_store_name_${productPartNumber}`}
                                    className="store-name">
                                    {e.storeName}
                                  </div>
                                  {e.inventoryStatus && (
                                    <div
                                      key={`inStock_div_${e.storeId}`}
                                      className="inventory-status in-stock"
                                      id={`product_availability_status_inStock_${productPartNumber}`}>
                                      {t(
                                        "CommerceEnvironment.inventoryStatus.Available"
                                      )}
                                    </div>
                                  )}
                                  {!e.inventoryStatus && (
                                    <div
                                      key={`outOfStock_div_${e.storeId}`}
                                      className="store-inventory out-of-stock"
                                      id={`product_availability_status_outOfStock_${productPartNumber}`}>
                                      {t(
                                        "CommerceEnvironment.inventoryStatus.OOS"
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </StyledTypography>
                          </>
                        )}
                        <StyledButton
                          color="primary"
                          size="small"
                          className="product-add-to-cart"
                          id={`product_add_to_cart_${productPartNumber}`}
                          onClick={addToCart}
                          disabled={!inventoryAvailableFlag || !buyableFlag}>
                          {t("productDetail.AddToCart")}
                        </StyledButton>
                      </>
                    </>
                  )}
                </div>
              </StyledGrid>
            </StyledGrid>
            <StyledGrid item xs={12}>
              {productDetailTabsChildren?.length > 0 && (
                <StyledTabs
                  key={currentSelection.sku.partNumber}
                  // adding key here to make sure tab is full re-rendered
                  //with new local state value according to different sku
                  childrenList={productDetailTabsChildren}
                  name="productDetails"
                />
              )}
            </StyledGrid>
          </StyledGrid>
        </StyledPDPContainer>
      )}
    </>
  );
}

ProductDetailsLayout.propTypes = {
  productPartNumber: PropTypes.string.isRequired,
  pdpData: PropTypes.any,
  storeId: PropTypes.string,
};

export default ProductDetailsLayout;
