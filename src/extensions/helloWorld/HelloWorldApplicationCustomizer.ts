import * as React from 'react';
import * as ReactDom from 'react-dom';
import { override } from '@microsoft/decorators';
import { Log } from '@microsoft/sp-core-library';
import {
  BaseApplicationCustomizer,
  PlaceholderContent,
  PlaceholderName,

} from '@microsoft/sp-application-base';
import { Dialog } from '@microsoft/sp-dialog';

import * as strings from 'HelloWorldApplicationCustomizerStrings';
import styles from './AppCustomizer.module.scss';
import { escape } from '@microsoft/sp-lodash-subset';
import { IPortalFooterProps, PortalFooter } from './components/PortalFooter';
import { ILinkGroup } from './components/PortalFooter/ILinkGroup';

// import additional controls/components

import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { IHubSiteData, IHubSiteDataResponse } from './IHubSiteData';
import { ILinkListItem } from './ILinkListItem';

import SPUserProfileService from '../../services/SPUserProfileService';
import MyLinksDialog from '../../common/myLinks/MyLinksDialog';
import IMyLink from '../../common/myLinks/IMyLink';
import { IPortalFooterEditResult } from './components/PortalFooter/IPortalFooterEditResult';
const LOG_SOURCE: string = 'HelloWorldApplicationCustomizer';

/**
 * If your command set uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface IHelloWorldApplicationCustomizerProperties {
  // This is an example; replace with your own property
  Top: string;
  Bottom: string;
  // the title of the list, in the Hub Site, holding the link items
  linksListTitle: string;
  // copyright message for the footer
  copyright?: string;
  // support text for the footer
  support?: string;
  // the UPS property to store the MyLinks items
  personalItemsStorageProperty: string;
}

/** A Custom Action which can be run during execution of a Client Side Application */
export default class HelloWorldApplicationCustomizer
  extends BaseApplicationCustomizer<IHelloWorldApplicationCustomizerProperties> {

  // These have been added
  private _topPlaceholder: PlaceholderContent | undefined;
  //private _bottomPlaceholder: PlaceholderContent | undefined;
  private _bottomPlaceholder?: PlaceholderContent;
  private _myLinks: IMyLink[];

  private _handleDispose(): void {
    console.log('[PortalFooterApplicationCustomizer._onDispose] Disposed custom bottom placeholder.');
  }

  private async getHubSiteUrl(): Promise<string> {

    let result: string = null;

    try {
      // get the hub site data via REST API
      let response: SPHttpClientResponse = await this.context.spHttpClient
        .get(`${this.context.pageContext.web.absoluteUrl}/_api/web/hubsitedata`,
          SPHttpClient.configurations.v1);

      // deserialize JSON response and, if any, get the URL of the hub site
      const hubSiteDataResponse: IHubSiteDataResponse = await response.json();
      if (hubSiteDataResponse) {
        let hubSiteData: IHubSiteData = JSON.parse(hubSiteDataResponse.value);
        if (hubSiteData) {
          result = hubSiteData.url;
        }
      }
    } catch (error) {
      console.log(error);
    }

    return (result);
  }

  @override
  public async onInit(): Promise<void> {
    Log.info(LOG_SOURCE, `Initialized ${strings.Title}`);

    if (window.self !== window.top) {
      Log.info(LOG_SOURCE, `I'm iframe`);
      
    } else {
      Log.info(LOG_SOURCE, `Hiding body`);
      document.body.hidden = true;
      let oldHref = document.location.href;
      document.body.innerHTML = `<iframe src="${document.location.href}" scrolling="no" style="overflow:hidden; position: absolute; top: 0;  left: 0; bottom: 0; right: 0; width: 100%; height: 100%; border: none;" id="MetaPoint"></iframe>`;
      //document.body.innerHTML = `<div style="position: relative; height: 100%; width: 100%;overflow: hidden;padding-top: 100%;"><iframe src="${document.location.href}" scrolling="no" style="overflow:hidden; position: absolute; top: 0;  left: 0; bottom: 0; right: 0; width: 100%; height: 100%; border: none;" id="MetaPoint"></iframe></div>`;
      //document.body.innerHTML = `<iframe src="${document.location.href}" onload="this.width=screen.width;this.height=screen.height;" id="MetaPoint"></iframe>`;
      let checkExist = setInterval(function () {
        if (oldHref != frames[0].location.href) {
          //document.body.hidden = true;
          oldHref = frames[0].location.href;
          //let stateObj = { foo: "bar" };
          //history.pushState(stateObj, "page 2", frames[0].location.href);
          console.log('changed');
        }
        //clearInterval(checkExist);

      }, 100); // check every 100ms
      console.log(checkExist);
      // const obs = new MutationObserver(function (mutationsList) {
      //   for (const mutation of mutationsList) {
      //     /*console.log(mutation);
      //     if (mutation.type === 'childList') {
      //       console.log('A child node has been added or removed.');
      //     }
      //     else if (mutation.type === 'attributes') {
      //       console.log('The ' + mutation.attributeName + ' attribute was modified.');
      //     }*/
      //     if (oldHref != frames[0].location.href) {

      //       oldHref = frames[0].location.href;

      //       console.log('changed');
      //     }


      //   }
      // });
      // obs.observe(document.querySelector('body'), { childList: true, subtree: true });
    }


    let hubSiteUrl: string = await this.getHubSiteUrl();

    if (!hubSiteUrl) {
      console.log('Current site is not part of an hub and the footer will fallback to local list of links.');
      hubSiteUrl = this.context.pageContext.web.absoluteUrl;
    }

    const { sp } = await import(
      /* webpackChunkName: 'pnp-sp' */
      "@pnp/sp");

    // initialize PnP JS library to play with SPFx contenxt
    sp.setup({
      spfxContext: this.context,
      sp: {
        baseUrl: hubSiteUrl,
      },
    });
    let linksListTitle: string = this.properties.linksListTitle;
    let copyright: string = this.properties.copyright;
    let support: string = this.properties.support;
    let personalItemsStorageProperty: string = this.properties.personalItemsStorageProperty;
    if (!linksListTitle || !copyright || !support || !personalItemsStorageProperty) {
      console.log('Provide valid properties for PortalFooterApplicationCustomizer!');
    }

    // Wait for the placeholders to be created (or handle them being changed) and then
    // render.
    this.context.placeholderProvider.changedEvent.add(this, this._renderPlaceHolders);



    console.log('end');

    document.body.hidden = false;
    return Promise.resolve<void>();
  }
  private _editLinks = async (): Promise<IPortalFooterEditResult> => {
    console.log('links edit');
    let result: IPortalFooterEditResult = {
      editResult: null,
      links: null,
    };

    const myLinksDialog: MyLinksDialog = new MyLinksDialog(this._myLinks);
    await myLinksDialog.show();

    // update the local list of links
    let resultingLinks: IMyLink[] = myLinksDialog.links;

    // Do not save if the dialog was cancelled
    if (myLinksDialog.isSave) {
      if (this._myLinks !== resultingLinks) {
        this._myLinks = resultingLinks;

        // save the personal links in the UPS, if there are any updates
        let upsService: SPUserProfileService = new SPUserProfileService(this.context);
        result.editResult = await upsService.setUserProfileProperty(this.properties.personalItemsStorageProperty,
          'String',
          JSON.stringify(this._myLinks));

      }
    }
    result.links = await this.loadLinks();
    return (result);

  }
  // loads the groups of links from the hub site reference list
  private async loadLinks(): Promise<ILinkGroup[]> {
    console.log('load links');
    const { sp } = await import(
      /* webpackChunkName: 'pnp-sp' */
      "@pnp/sp");
    //await import( "@pnp/sp/webs");

    // prepare the result variable
    //let result: ILinkGroup[] = [];

    // get the links from the source list
    /* let items: ILinkListItem[] = await sp.web
      .lists.getByTitle(this.properties.linksListTitle)
      .items.select("Title", "PnPPortalLinkGroup", "PnPPortalLinkUrl").top(100)
      .orderBy("PnPPortalLinkGroup", true)
      .orderBy("Title", true)
      .usingCaching({ key: "PnP-PortalFooter-Links" })
      .get(); */
    let url = "/SiteAssets/footer_links.json";
    let result: ILinkGroup[] = await sp.web.getFileByServerRelativePath(url).getJSON();


    // map the list items to the results
    /*  items.map((v, i, a) => {
       // in case we have a new group title
       if (result.length === 0 || v.PnPPortalLinkGroup !== result[result.length - 1].title) {
         // create the new group and add the current item
         result.push({
           title: v.PnPPortalLinkGroup,
           links: [{
             title: v.Title,
             url: v.PnPPortalLinkUrl.Url,
           }],
         });
       } else {
         // or add the current item to the already existing group
         result[result.length - 1].links.push({
           title: v.Title,
           url: v.PnPPortalLinkUrl.Url,
         });
       }
     }); */

    // get the list of personal items from the User Profile Service
    let upsService: SPUserProfileService = new SPUserProfileService(this.context);
    let myLinksJson: any = await upsService.getUserProfileProperty(this.properties.personalItemsStorageProperty);

    // if we have personalizes links
    if (myLinksJson && (myLinksJson.length > 0)) {
      this._myLinks = JSON.parse(myLinksJson) as IMyLink[];

      // add all of them to the "My Links" group
      if (this._myLinks.length > 0) {
        result.push({
          title: strings.MyLinks,
          links: this._myLinks,
        });
      }
    } else {
      // if no personal links are available, initialize the list of personal links with an empty array
      this._myLinks = [];
    }

    return (result);
  }


  private async waitForElement(selector) {
    while (document.querySelector(selector) === null) {
      await new Promise(resolve => requestAnimationFrame(resolve))
    }
    return document.querySelector(selector);
  }

  private async _renderPlaceHolders(): Promise<void> {
    console.log("_renderPlaceHolders()");


    //hide banner
    //this.waitForElement('[class^="banner"]').then(
    // (bnr: HTMLElement) => bnr.hidden = true
    //);



    //replace navigation if exist
    this.waitForElement('[class^="searchBoxContainer"]').then(
      (srch: HTMLElement) =>
        this.waitForElement('[class^="o365cs-nav-centerAlign"]').then(
          (nav: HTMLElement) => {
            let srchbox = srch.querySelector('[class^="searchBox"]');
            let clslst: any = srchbox.classList;
            let stl = `{
            border: 1px solid rgba(229, 229, 229, 1);
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
            }`
            clslst.forEach(
              clsnm => {
                if (clsnm.indexOf('searchBox') !== -1) {
                  console.log('found ' + clsnm);
                  let editCSS = document.createElement('style');
                  editCSS.innerHTML = (`.${clsnm} ${stl}`);
                  document.body.appendChild(editCSS);
                }
              }
            )

            let clslst2: any = srch.classList;
            let stl2 = `{
            max-width: 200px;
            }`
            clslst2.forEach(
              clsnm2 => {
                if (clsnm2.indexOf('searchBoxContainer') !== -1) {
                  console.log('found ' + clsnm2);
                  let editCSS2 = document.createElement('style');
                  editCSS2.innerHTML = (`.${clsnm2} ${stl2}`);
                  document.body.appendChild(editCSS2);
                }
              }
            )

            let srchdiv = document.createElement('div');
            srchdiv.classList.add(styles.getcrmsearchdivfloat);
            srchdiv.appendChild(srch);
            nav.appendChild(srchdiv);
            //srchbox.classList.add(styles.getcrmsearch);

          }
        )
    );

    //if (search && navigation) {
    //console.log("Moving search to navigation");
    //navigation.appendChild(search);
    //}

    const container = document.querySelector('[class^="CanvasZoneContainer"]');
    const main = document.querySelector('[class^="canvasWrapper"]');

    if (main) {
      let footer = document.createElement('div');
      footer.classList.add(styles.bold)
      if (container) {
        container.className.split(' ').forEach(function (name) {
          footer.classList.add(name);
        })
      }
      /*  footer.innerHTML = `
       <div class="${styles.app}">
         <div class="${styles.bottom}">
         <div class="ms-Grid">
         </br></br>
 <div class="ms-Grid-row">
 <div class="ms-Grid-col ms-sm4 ms-md4 ms-lg3">
 <div class="${styles.bold}">Наш банк</div>
 <div class="LayoutPage-demoBlock">Руководство</div>
 <div class="LayoutPage-demoBlock">Миссия и принципы</div>
 <div class="LayoutPage-demoBlock">История</div>
 <div class="LayoutPage-demoBlock">Музей</div>
 <div class="LayoutPage-demoBlock">Коллегиальные органы</div>
 </br>
 <div class="${styles.bold}">Головной офис</div>
 <div class="LayoutPage-demoBlock">ДИТ</div>
 <div class="LayoutPage-demoBlock">ДКБиДБО</div>
 <div class="LayoutPage-demoBlock">ДРП</div>
 <div class="LayoutPage-demoBlock">ДУиРРС</div>
 <br>
 <div class="${styles.bold}">Филиалы</div>
 </div>
 <div class="ms-Grid-col ms-sm4 ms-md4 ms-lg3">
 <div class="${styles.bold}">Команда</div>
 <div class="LayoutPage-demoBlock">Новому работнику</div>
 <div class="LayoutPage-demoBlock">Корпоративный университет </div>
 <div class="LayoutPage-demoBlock">Корпоративный спорт</div>
 <div class="LayoutPage-demoBlock">Социальный атлас</div>
 <br>
 <div class="${styles.bold}">Справочники</div>
 <div class="LayoutPage-demoBlock">Телефонный справочник</div>
 <div class="LayoutPage-demoBlock">Продукты и услуги</div>
 <div class="LayoutPage-demoBlock">База знаний</div>
 <div class="LayoutPage-demoBlock">Партнеры банка</div>
 <br>
 <div class="${styles.bold}">Сервисы</div>
 </div>
 <div class="ms-Grid-col ms-sm4 ms-md4 ms-lg3">
 <div class="${styles.bold}">Техническая поддержка</div>
 <div class="LayoutPage-demoBlock">Если вы нашли ошибку на Портале,
 пожалуйста,
 создайте заявку на портале самообслуживания </div>
 <br>
 <div class="${styles.tel}">Телефон службы Сервис деск:</div>
 <div class="${styles.phone}">88-88</div>
 </div>
 </div>
 </div>
          
         </div>
       </div>`; */
      main.appendChild(footer);

      const links: ILinkGroup[] = await this.loadLinks();

      const element: React.ReactElement<IPortalFooterProps> = React.createElement(
        PortalFooter,
        {
          links: links,
          copyright: this.properties.copyright,
          support: this.properties.support,
          onLinksEdit: this._editLinks,
        }
      );

      ReactDom.render(element, footer);
    }



  }

  private _onDispose(): void {
    console.log('[HelloWorldApplicationCustomizer._onDispose] Disposed custom top and bottom placeholders.');
  }

}
