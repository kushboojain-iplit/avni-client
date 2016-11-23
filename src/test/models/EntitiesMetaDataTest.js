import {expect} from 'chai';
import EntityMetaData from "../../js/models/EntityMetaData";
import Settings from "../../js/models/Settings";
import {Locale} from "../../js/models/Locale";
import Individual from "../../js/models/Individual";

describe('EntitiesMetaDataTest', () => {
    it('entitiesLoadedFromServer', () => {
        var entitiesLoadedFromServer = EntityMetaData.entitiesLoadedFromServer();
        expect(entitiesLoadedFromServer.indexOf(Settings)).is.equal(-1);
        expect(entitiesLoadedFromServer.indexOf(Locale)).is.equal(-1);
        console.log(entitiesLoadedFromServer);
        expect(entitiesLoadedFromServer.indexOf(Individual)).is.not.equal(-1);
    });
});