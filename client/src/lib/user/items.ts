interface IVortexPickaxeItem {
    multiplier: number;
}

interface IVortexItem {
    identifier: string;
    name: string;
    price: number;
    buyable?: boolean;
    stackable?: boolean;
    data?: any | IVortexPickaxeItem
}

export const VortexItems = [];

VortexItems.push({
    identifier: "wood_pickaxe",
    name: "Wood Pickaxe",
    price: 1000,
    buyable: true,
    stackable: false,
    data: {
        multiplier: 1
    }
});

export const getInventoryItem = (identifier: string): IVortexItem => VortexItems.filter(item => item.identifier === identifier)[0];
export const getBuyableItems = (): IVortexItem[] => VortexItems.filter(item => item.buyable);