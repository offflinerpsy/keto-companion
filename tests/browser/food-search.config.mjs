import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:['food-search.spec.mjs','grocery-intake.spec.mjs'],workers:1,timeout:60000,
 use:{baseURL:'http://127.0.0.1:8898',viewport:{width:402,height:681},screen:{width:402,height:874},deviceScaleFactor:3,isMobile:true,hasTouch:true,timezoneId:'Europe/Minsk'},
 projects:[{name:'chromium-402',use:{browserName:'chromium',launchOptions:process.env.KETO_CHROMIUM_EXECUTABLE?{executablePath:process.env.KETO_CHROMIUM_EXECUTABLE}:{}}},{name:'webkit-402',use:{browserName:'webkit'}}],
 webServer:{cwd:new URL('../..',import.meta.url).pathname,command:'.venv/bin/python tests/browser/intake_server.py',url:'http://127.0.0.1:8898',reuseExistingServer:false},
 outputDir:new URL('../../qa/mobile-browser/c17-results',import.meta.url).pathname,reporter:[['list'],['json',{outputFile:'qa/mobile-browser/c17-results.json'}]]});
