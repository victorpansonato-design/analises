import iconHeader from "@/assets/icons/icone_header.png";
import logoAnchieta from "@/assets/images/grupo-anchieta.png";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { ITEM_MOTION_TRANSITION, SECTION_MOTION_TRANSITION } from "@/layout/sidebar/sidebar.constants";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

export function SystemLogo() {
   const { isMobile, setOpenMobile, state } = useSidebar();
   const collapsed = !isMobile && state === "collapsed";

   const handleNavigate = () => {
      if (isMobile) setOpenMobile(false);
   };

   return (
      <motion.div
         layout
         initial={false}
         animate={{ paddingLeft: collapsed ? 6 : 12, paddingRight: collapsed ? 6 : 12 }}
         transition={SECTION_MOTION_TRANSITION}
         className="flex min-h-15 items-center pb-2 pt-4"
      >
         <Link to="/analises" aria-label="Grupo Anchieta — ir para Análises" onClick={handleNavigate} className="shrink-0 rounded-sm">
            <motion.span
               layout="position"
               transition={ITEM_MOTION_TRANSITION}
               className={collapsed ? "grid size-9 place-items-center" : "flex h-14 w-40 items-center"}
            >
               <img
                  src={collapsed ? iconHeader : logoAnchieta}
                  alt=""
                  width={collapsed ? 300 : 385}
                  height={collapsed ? 300 : 137}
                  className="size-full object-contain"
               />
            </motion.span>
         </Link>

         {isMobile && (
            <Button
               variant="ghost"
               size="icon"
               className="ml-auto size-8 text-muted-foreground [&_svg]:size-4"
               aria-label="Fechar menu"
               onClick={() => setOpenMobile(false)}
            >
               <X />
            </Button>
         )}
      </motion.div>
   );
}
