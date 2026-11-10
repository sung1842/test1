"use client";

import { createContext, useContext } from "react";

/** DeskFrame(기업 화면 공용 틀) 안인지. 안이면 ProductShell·DeskTabs 는 그리지 않는다 */
export const DeskFrameContext = createContext(false);
export const useInDeskFrame = () => useContext(DeskFrameContext);
